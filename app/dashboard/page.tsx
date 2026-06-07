import AddNewButton from "@/features/dashboard/components/add-new-btn"
import AddRepo from "@/features/dashboard/components/add-repo"
import ProjectList from "@/features/dashboard/components/project-list"
import ProjectTable from "@/features/dashboard/components/project-table"
import { getAllPlaygroundForUser } from "@/features/playground/actions"

const DashboardMainPage = async() => {
  const playgrounds = await getAllPlaygroundForUser()
  console.log(playgrounds)
  return (
    <div className="flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <AddNewButton />
        <AddRepo />
      </div>
<div className="mt-10 flex flex-col justify-center items-center w-full">
  {/* @ts-ignore */}
<ProjectTable projects={playgrounds || []} />
</div>
      {/* <ProjectList projects={playgrounds} /> */}
    </div>
  )
}

export default DashboardMainPage
