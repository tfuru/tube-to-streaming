<template>
  <div class="wiew-bookmarklet">
    <Bookmarklet />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Bookmarklet from "@/components/Bookmarklet.vue";
import store from "@/store";

@Component({
  components: {
    Bookmarklet
  },
  computed: {

  },  
})
export default class ViewBookmarklet extends Vue {
  currentUser = store.getters.user;
  
  mounted(): void {
    const userid = (this.currentUser == null)? 'dummy' : this.currentUser.uid;
    console.log('currentUser', userid);
  }
}
</script>