"""MOSPI API client for CPI collection.

The original file was a one-off script with hardcoded credentials and
command-line parsing. This version keeps the SSL workaround but exposes a
reusable client that the pipeline can call from `main.py`.
"""

from __future__ import annotations

import os
import ssl
from typing import Any, Iterable

import requests
import urllib3
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def _join_csv(value: Any) -> str:
    if value is None or value == "":
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, Iterable):
        return ",".join(str(item) for item in value)
    return str(value)


class LegacySSLAdapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        context = create_urllib3_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        legacy_flag = getattr(ssl, "OP_LEGACY_SERVER_CONNECT", 0)
        if legacy_flag:
            context.options |= legacy_flag
        kwargs["ssl_context"] = context
        return super().init_poolmanager(*args, **kwargs)


class MospiClient:
    def __init__(
        self,
        token: str | None = None,
        base_url: str | None = None,
        timeout: int = 60,
        session: requests.Session | None = None,
    ) -> None:
        self.token = token or os.getenv("MOSPI_ACCESS_TOKEN")

        self.base_url = (base_url or os.getenv("MOSPI_BASE_URL")
                         or "https://api.mospi.gov.in").rstrip("/")
        self.timeout = timeout
        self.session = session or requests.Session()
        self.session.mount("https://", LegacySSLAdapter())
        # If token not provided but login creds exist, try to fetch a token
        if not self.token:
            email = os.getenv("MOSPI_LOGIN_EMAIL")
            pwd = os.getenv("MOSPI_LOGIN_PASSWORD")
            if email and pwd:
                try:
                    tok = self._fetch_token_from_credentials(email, pwd)
                    if tok:
                        self.token = tok
                        # persist to .env for convenience
                        try:
                            self._save_token_to_env(tok)
                        except Exception:
                            pass
                except Exception:
                    # don't fail init if token fetch fails
                    pass

    def _headers(self, include_auth: bool = True) -> dict[str, str]:
        headers: dict[str, str] = {}
        if include_auth and self.token:
            headers["authorization"] = self.token
        return headers

    def _request_json(
        self,
        endpoint: str,
        params: dict[str, Any],
        include_auth: bool = True,
    ) -> dict[str, Any]:
        response = self.session.get(
            f"{self.base_url}{endpoint}",
            params=params,
            headers=self._headers(include_auth=include_auth),
            timeout=self.timeout,
            verify=False,
        )

        if response.status_code == 401 and include_auth:
            response = self.session.get(
                f"{self.base_url}{endpoint}",
                params=params,
                headers=self._headers(include_auth=False),
                timeout=self.timeout,
                verify=False,
            )

        response.raise_for_status()
        return response.json()

    @staticmethod
    def _data_from_payload(payload: dict[str, Any], format_name: str) -> Any:
        if format_name.upper() == "JSON":
            return payload.get("data", payload)
        return payload

    def fetch_cpi_index(
        self,
        series: str = "Current_Series_2012",
        base_year: Any = "",
        year: Any = "",
        month: Any = "",
        state_code: Any = "",
        group_code: Any = "",
        subgroup_code: Any = "",
        sector: Any = "",
        format_name: str = "JSON",
        raw: bool = False,
    ) -> Any:
        # Allow callers to prefer a different base year (series) such as 2024.
        if base_year not in (None, ""):
            series = f"Current_Series_{base_year}"

        params: dict[str, Any] = {"Series": series, "Format": format_name}
        # MOSPI honors `limit` for page size.
        params["limit"] = 50000

        if year != "":
            params["Year"] = _join_csv(year)
        if month != "":
            params["Month"] = _join_csv(month)
        if state_code != "":
            params["State_code"] = _join_csv(state_code)
        if group_code != "":
            params["Group_code"] = _join_csv(group_code)
        if subgroup_code != "":
            params["Subgroup_code"] = _join_csv(subgroup_code)
        if sector != "":
            params["Sector"] = _join_csv(sector)

        # Single request with a large page size should return most records
        # for the requested Year/Month combination. If the API reports
        # multiple pages, fetch subsequent pages but with a safety cap to
        # avoid thousands of requests in pathological cases.
        payload = self._request_json("/api/cpi/getCPIIndex", params)

        if isinstance(payload, dict):
            meta = payload.get("meta_data") or {}
            total_pages = int(meta.get("totalPages", 1) or 1)
            page_size = int(params.get("limit", 10000))

            if total_pages > 1:
                combined = payload.get("data", []) or []
                max_pages = 2000
                for page in range(2, min(total_pages, max_pages) + 1):
                    params["page"] = page
                    part = self._request_json("/api/cpi/getCPIIndex", params)
                    if not isinstance(part, dict):
                        break
                    chunk = part.get("data", []) or []
                    if not chunk:
                        break
                    combined.extend(chunk)
                    # stop early when server returns a partial page
                    if len(chunk) < page_size:
                        break

                payload["data"] = combined

        return payload if raw else self._data_from_payload(payload, format_name)

    def fetch_cpi_series(
        self,
        series: str,
        format_name: str = "JSON",
        raw: bool = False,
        page_size: int = 50000,
        max_pages: int = 2000,
    ) -> Any:
        print(f"  Fetching series {series} (page size={page_size})")
        params: dict[str, Any] = {
            "Series": series,
            "Format": format_name,
            "limit": page_size,
        }

        payload = self._request_json("/api/cpi/getCPIIndex", params)

        if isinstance(payload, dict):
            meta = payload.get("meta_data") or {}
            total_pages = int(meta.get("totalPages", 1) or 1)
            combined = payload.get("data", []) or []
            effective_page_size = int(meta.get("recordPerPage") or len(combined) or page_size)

            for page in range(2, min(total_pages, max_pages) + 1):
                params["page"] = page
                part = self._request_json("/api/cpi/getCPIIndex", params)
                if not isinstance(part, dict):
                    break
                chunk = part.get("data", []) or []
                if not chunk:
                    break
                combined.extend(chunk)
                if page % 1 == 0:
                    print(f"    page {page}/{min(total_pages, max_pages)} -> {len(combined)} rows")
                if len(chunk) < effective_page_size:
                    break

            payload["data"] = combined

        return payload if raw else self._data_from_payload(payload, format_name)

    def fetch_item_index(
        self,
        year: Any = "",
        month: Any = "",
        item: Any = "",
        format_name: str = "JSON",
        raw: bool = False,
    ) -> Any:
        params: dict[str, Any] = {"Format": format_name}

        if year != "":
            params["Year"] = _join_csv(year)
        if month != "":
            params["Month"] = _join_csv(month)
        if item != "":
            params["Item"] = _join_csv(item)

        payload = self._request_json("/api/cpi/getItemIndex", params)
        return payload if raw else self._data_from_payload(payload, format_name)

    def fetch_wpi_records(
        self,
        base_year: Any = "2011-12",
        year: Any = "",
        month_code: Any = "",
        major_group_code: Any = "",
        group_code: Any = "",
        sub_group_code: Any = "",
        sub_sub_group_code: Any = "",
        item_code: Any = "",
        format_name: str = "JSON",
        raw: bool = False,
        page_size: int = 50000,
        max_pages: int = 2000,
    ) -> Any:
        params: dict[str, Any] = {
            "base_year": _join_csv(base_year),
            "Format": format_name,
            "limit": page_size,
        }

        if year != "":
            params["year"] = _join_csv(year)
        if month_code != "":
            params["month_code"] = _join_csv(month_code)
        if major_group_code != "":
            params["major_group_code"] = _join_csv(major_group_code)
        if group_code != "":
            params["group_code"] = _join_csv(group_code)
        if sub_group_code != "":
            params["sub_group_code"] = _join_csv(sub_group_code)
        if sub_sub_group_code != "":
            params["sub_sub_group_code"] = _join_csv(sub_sub_group_code)
        if item_code != "":
            params["item_code"] = _join_csv(item_code)

        payload = self._request_json("/api/wpi/getWpiRecords", params)

        if isinstance(payload, dict):
            meta = payload.get("meta_data") or {}
            total_pages = int(meta.get("totalPages", 1) or 1)
            combined = payload.get("data", []) or []
            effective_page_size = int(meta.get("recordPerPage") or len(combined) or page_size)

            for page in range(2, min(total_pages, max_pages) + 1):
                params["page"] = page
                part = self._request_json("/api/wpi/getWpiRecords", params)
                if not isinstance(part, dict):
                    break
                chunk = part.get("data", []) or []
                if not chunk:
                    break
                combined.extend(chunk)
                if len(chunk) < effective_page_size:
                    break

            payload["data"] = combined

        return payload if raw else self._data_from_payload(payload, format_name)

    def _fetch_token_from_credentials(self, email: str, password: str) -> str | None:
        """Attempt to obtain an access token using provided credentials.

        Looks for MOSPI_TOKEN_URL in env or falls back to a common login path.
        Tries common payload keys and token response keys.
        """
        token_url = os.getenv("MOSPI_TOKEN_URL") or f"{self.base_url}/api/auth/login"
        payload_variants = [
            {"email": email, "password": password},
            {"username": email, "password": password},
            {"user": email, "pass": password},
        ]

        resp = None
        for payload in payload_variants:
            try:
                resp = self.session.post(token_url, json=payload, timeout=self.timeout, verify=False)
                if resp.status_code in (200, 201):
                    break
            except Exception:
                resp = None

        if not resp or resp.status_code not in (200, 201):
            return None

        try:
            j = resp.json()
        except Exception:
            return None

        # common keys where token might be present
        candidates = ["access_token", "token", "data", "result", "auth"]
        # helper to dig into nested dicts
        def _dig(d, key):
            if not isinstance(d, dict):
                return None
            if key in d and isinstance(d[key], str):
                return d[key]
            # if key maps to dict, look for token-like keys inside
            val = d.get(key)
            if isinstance(val, dict):
                for k in ("access_token", "token"):
                    if k in val and isinstance(val[k], str):
                        return val[k]
            return None

        for k in ("access_token", "token", "Authorization", "auth_token"):
            if k in j and isinstance(j[k], str):
                return j[k]

        # MOSPI-specific: token is at top-level `response` field
        if "response" in j and isinstance(j["response"], str) and len(j["response"]) > 20:
            return j["response"]

        for c in candidates:
            t = _dig(j, c)
            if t:
                return t

        return None

    def _save_token_to_env(self, token: str) -> None:
        """Write or update MOSPI_ACCESS_TOKEN in a .env file at repo root."""
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        env_path = os.path.join(repo_root, ".env")
        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf8") as f:
                lines = f.readlines()

        key = "MOSPI_ACCESS_TOKEN"
        found = False
        new_lines = []
        for ln in lines:
            if ln.strip().startswith(key + "="):
                new_lines.append(f"{key}={token}\n")
                found = True
            else:
                new_lines.append(ln)

        if not found:
            new_lines.append(f"{key}={token}\n")

        with open(env_path, "w", encoding="utf8") as f:
            f.writelines(new_lines)


__all__ = ["MospiClient"]