import React from 'react'

interface PlaygroundClientProps {
  initialData?: {
    templateFiles: Array<{ content: string }>;
  } | null;
}

const PlaygroundClient: React.FC<PlaygroundClientProps> = ({ initialData }) => {
   return (
     <div>PlaygroundClient</div>
   )
 }

export default PlaygroundClient