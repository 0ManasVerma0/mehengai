import RuralVsUrbanChart from '../Charts/RuralVsUrbanChart'
import FoodVsNonFoodChart from '../Charts/FoodVsNonFoodChart'

export default function SecondaryDashboard() {
	return (
		<section id="distribution" className="grid gap-6 xl:grid-cols-2">
			<RuralVsUrbanChart />
			<FoodVsNonFoodChart />
		</section>
	)
}
