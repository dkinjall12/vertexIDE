import Image from "next/image"
import { format } from "date-fns"
import type { Project } from "../types"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

interface ProjectTableProps {
  projects: Project[]
}

export default function ProjectTable({ projects }: ProjectTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>User</TableHead>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
             
              <TableCell className="font-medium">
                <div className="flex flex-col">
                <Link href={`/playground/${project.id}`} className="hover:underline">
                  <span className="font-semibold">{project.title}</span>
              </Link>
                  <span className="text-sm text-gray-500 line-clamp-1">{project.description}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-[#E93F3F15] text-[#E93F3F] border-[#E93F3F]">
                  {project.template}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(project.createdAt), "MMM d, yyyy")}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <Image
                      src={project.user.image || "/placeholder.svg"}
                      alt={project.user.name}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                  <span className="text-sm">{project.user.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-gray-500 font-mono">{project.id.substring(0, 12)}...</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
