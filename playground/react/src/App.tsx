import React, { useState, useEffect } from 'react';
import { RemoteStateContext, useRemoteState } from '@rstate/react';

import './App.css';

function CustomNamespace(props: {
  namespace?: string
}) {
  const [todo, setTodo] = useRemoteState<string[] | undefined>('todo', [])
  const [val, setVal] = useState('')

  console.log(todo)
  return <div>
    <span>[[{props.namespace}]]</span>
    {todo?.map((i, index) => <div key={index}>{i}</div>)}
    <form onSubmit={(ev) => {
      ev.preventDefault()
      console.log(val)
      setTodo([...(todo || []), val])
      setVal('')
    }}>
      <input value={val} onChange={(ev) => setVal(ev.target.value)} />
    </form>
  </div>
}

function App() {
  return (
    <div className="flex">
      <section>
        <CustomNamespace namespace="default" />
      </section>

      <section>
        <RemoteStateContext.Provider value="nice-to-see-u">
          <CustomNamespace namespace="nice-to-see-u" />
        </RemoteStateContext.Provider>
      </section>
    </div>
  );
}

export default App;
