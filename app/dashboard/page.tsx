import AddNewButton from "@/features/dashboard/components/add-new-btn"
import AddRepo from "@/features/dashboard/components/add-repo"

const DashboardMainPage = () => {
  return (
    <div className="flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <AddNewButton />
        <AddRepo />
      </div>
    </div>
  )
}

export default DashboardMainPage
