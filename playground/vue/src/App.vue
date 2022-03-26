<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import { useRemoteState } from "@rstate/vue";
import { ref } from "vue";
const todoVal = ref('')
const [todos, validating] = useRemoteState<string[]>("todo", []);

const handleSubmit = (e) => {
  e.preventDefault()
  todos.value = [...(todos.value || []), todoVal.value]
  todoVal.value = ''
}

</script>

<template>
  <div>
    <div v-for="(todo, index) in todos" v-bind:key="{ index }">
      {{ todo }}
    </div>

    <form v-on:submit="handleSubmit">
      <input v-model="todoVal" />
    </form>
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
