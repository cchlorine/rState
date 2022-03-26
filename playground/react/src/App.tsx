import React, { useState } from 'react';
import { useRemoteState } from '@rstate/react';

import './App.css';
function App() {
  const [todo, setTodo] = useRemoteState<string[]>('todo', [])
  const [val, setVal] = useState('')

  return (
    <div>
      {todo.map((i) => <div key={i}>{i}</div>)}
      <form onSubmit={(ev) => {
        ev.preventDefault()
        setTodo([...todo, val])
        setVal('')
      }}>
        <input value={val} onChange={(ev) => setVal(ev.target.value)} />
      </form>
    </div>
  );
}

export default App;
