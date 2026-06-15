import React from 'react'

interface PlaygroundClientProps {
    initialData: {
    templateFiles: {
        content: any; // Replace 'any' with a more specific type if needed
    }[];
} | null | undefined
}

const PlaygroundClient = ({initialData}: PlaygroundClientProps) => {
  return (
    <div>PlaygroundClient</div>
  )
}

export default PlaygroundClient