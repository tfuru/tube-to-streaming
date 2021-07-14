javascript:(async () => {
    const url = new URL(window.location);
    if (url.searchParams.has('v') == false) {
        // Vパラメーターがなかった
        alert('videoid が 抽出できませんでした。URLを確認してください');
        return null;
    }
    const videoid = url.searchParams.get('v');
    const userid = 'dummy';
    
    console.log('videoid', videoid);
    console.log('userid', userid);

    const apiUrl = `https://tube-to-streaming.an.r.appspot.com/api/convert/last/${userid}/${videoid}`;
    console.log('apiUrl', apiUrl);
    const response = await fetch(apiUrl);
    console.log('response', response);
    if (response.status == 200) {
        alert('動画が設定されました。ワールドで再生してみてください');
    } else {
        alert('エラーが発生しました');
    }
})()
