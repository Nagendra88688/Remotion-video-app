import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { EditorPage } from './editor/EditorPage'

function App() {
  const [count, setCount] = useState(0)

  return (
   <div>
    HELLO
    <EditorPage />
   </div>
  )
}

export default App
