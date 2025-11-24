(async () => {
  const LIFF_ID = 'YOUR_LIFF_ID'; // ←後で本番のLIFF IDに置換

  await liff.init({ liffId: LIFF_ID });
  if (!liff.isLoggedIn()) liff.login();

  document.getElementById('sendBtn').onclick = async () => {
    const get = id => document.getElementById(id).value;
    const fields = {
      name: get('name'), type: get('type'), price: get('price'), abv: get('abv'),
      taste: get('taste'), aroma: get('aroma'), balance: get('balance'),
      tags: get('tags'), comment: get('comment')
    };
    const kv = Object.entries(fields)
      .filter(([,v]) => v !== '')
      .map(([k,v]) => `${k}=${JSON.stringify(v)}`)  // スペース対策でJSON.stringify
      .join(' ');
    const text = `/log ${kv}`;

    try {
      await liff.sendMessages([{ type: 'text', text }]);
      alert('送信しました。トークの返信をご確認ください。');
      liff.closeWindow();
    } catch (e) {
      console.error(e);
      alert('送信に失敗しました。友だち追加/権限/LIFF設定を確認してください。');
    }
  };
})();
