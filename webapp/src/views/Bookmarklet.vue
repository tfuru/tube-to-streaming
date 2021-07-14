<template>
  <div class="wiew-bookmarklet">
    <Bookmarklet />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Bookmarklet from "@/components/Bookmarklet.vue";

@Component({
  components: {
    Bookmarklet
  },
  computed: {

  },  
})
export default class ViewBookmarklet extends Vue {

}
</script>