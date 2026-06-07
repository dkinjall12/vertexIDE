import React from 'react'

const page = async({params}:{params:Promise<{id:string}>}) => {
  const param = await (params)

    return (
    <div>
      <h1>{param.id}</h1>
    </div>
  )
}

export default page