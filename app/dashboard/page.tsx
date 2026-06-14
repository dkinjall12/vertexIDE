<<<<<<< HEAD
import React from 'react'

const DashboardMainPage = () => {
  return (
    <div>DashboardMainPage</div>
  )
}

export default DashboardMainPage
=======
import AddNewButton from "@/features/dashboard/components/add-new-btn";
import AddRepo from "@/features/dashboard/components/add-repo";

import ProjectTable from "@/features/dashboard/components/project-table";
import { getAllPlaygroundForUser , deleteProjectById ,editProjectById , duplicateProjectById} from "@/features/playground/actions";

const DashboardMainPage = async () => {
  const playgrounds = await getAllPlaygroundForUser();
  console.log(playgrounds);
  return (
    <div className="flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <AddNewButton />
        <AddRepo />
      </div>
      <div className="mt-10 flex flex-col justify-center items-center w-full">
        {/* @ts-ignore */}
        <ProjectTable projects={playgrounds || []} onDeleteProject={  deleteProjectById} onUpdateProject={editProjectById} onDuplicateProject={duplicateProjectById}/>
      </div>
    
    </div>
  );
};

export default DashboardMainPage;
>>>>>>> 372e3bc1481a84dc0ffee574b447818c0c2758b9
