javascript:(async () => {
    const url = new URL(window.location);
    const videoid = url.searchParams.get('v')
    console.log('videoid', videoid);
    const apiUrl = `https://tube-to-streaming.an.r.appspot.com/api/convert/last/${videoid}`;
    console.log('apiUrl', apiUrl);
    const response = await fetch(apiUrl);
    console.log('response', response);
    if (response.status == 200) {
        alert('動画が設定されました。ワールドで再生してみてください');
    } else {
        alert('エラーが発生しました');
    }
})()