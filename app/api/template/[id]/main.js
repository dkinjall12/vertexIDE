const datDBSa = [
  {
    "filename": "package",
    "fileExtension": "json",
    "content": "{\r\n  \"name\": \"react-ts-starter\",\r\n  \"private\": true,\r\n  \"scripts\": {\r\n    \"start\": \"react-scripts start\",\r\n    \"build\": \"react-scripts build\",\r\n    \"test\": \"react-scripts test --env=jsdom\",\r\n    \"eject\": \"react-scripts eject\"\r\n  },\r\n  \"dependencies\": {\r\n    \"@types/react\": \"^18.2.21\",\r\n    \"@types/react-dom\": \"^18.2.7\",\r\n    \"react\": \"^18.2.0\",\r\n    \"react-dom\": \"^18.2.0\"\r\n  },\r\n  \"devDependencies\": {\r\n    \"react-scripts\": \"^5.0.1\",\r\n    \"typescript\": \"^4.9.5\"\r\n  },\r\n  \"browserslist\": [\r\n    \"defaults\"\r\n  ]\r\n}\r\n"
  },
  {
    "folderName": "public",
    "items": [
      {
        "filename": "index",
        "fileExtension": "html",
        "content": "<div id=\"app\"></div>"
      }
    ]
  },
  {
    "folderName": "src",
    "items": [
      {
        "filename": "App",
        "fileExtension": "tsx",
        "content": "import { FC } from 'react';\r\n\r\nimport './style.css';\r\n\r\nexport const App: FC<{ name: string }> = ({ name }) => {\r\n  return (\r\n    <div>\r\n      <h1>Hello {name}!</h1>\r\n      <p>Start editing to see some magic happen :)</p>\r\n    </div>\r\n  );\r\n};\r\n"
      },
      {
        "filename": "index",
        "fileExtension": "tsx",
        "content": "import { StrictMode } from 'react';\r\nimport { createRoot } from 'react-dom/client';\r\n\r\nimport { App } from './App';\r\n\r\nconst root = createRoot(document.getElementById('app'));\r\n\r\nroot.render(\r\n  <StrictMode>\r\n    <App name=\"StackBlitz\" />\r\n  </StrictMode>\r\n);\r\n"
      },
      {
        "filename": "style",
        "fileExtension": "css",
        "content": "* {\r\n  box-sizing: border-box;\r\n}\r\n\r\nbody {\r\n  margin: 0;\r\n  padding: 1rem;\r\n  font-family: system-ui, sans-serif;\r\n  color: black;\r\n  background-color: white;\r\n}\r\n\r\nh1 {\r\n  font-weight: 800;\r\n  font-size: 1.5rem;\r\n}\r\n"
      }
    ]
  },
  {
    "filename": "tsconfig",
    "fileExtension": "json",
    "content": "{\r\n  \"compilerOptions\": {\r\n    \"jsx\": \"react-jsx\",\r\n    \"lib\": [\"DOM\", \"ES2022\"],\r\n    \"moduleResolution\": \"node\",\r\n    \"target\": \"ES2022\"\r\n  }\r\n}\r\n"
  }
]

console.log(JSON.parse(JSON.stringify(datDBSa)))
