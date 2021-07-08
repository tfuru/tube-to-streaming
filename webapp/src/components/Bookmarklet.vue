<template>
  <div class="bookmarklet content">
    <h2 class="subtitle">ブックマークレット</h2>
    <p>Chromeのブックマークバーに<br>下のリンクをドラッグ＆ドロップすると<br>ブックマークレットを登録できます。</p>
    <a href="/bookmarklet/tube-to-streaming.js">URLを設定するブックマークレット</a>
    <h3>使い方</h3>
    <div>
      <ol>
        <li>ブックマークレットを登録する</li>
        <li>YouTubeの見たい動画を開く</li>
        <li>ブックマークレットをクリックして実行する</li>
      </ol>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Bookmarklet extends Vue {

}
</script>

<style>
.bookmarklet {
  margin-top: 20px;
}

ol {
  display: inline-block;
  width: 320px;
  text-align: left;
  margin: 0 auto;
}

</style>