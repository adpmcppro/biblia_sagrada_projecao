const https = require('https');

https.get('https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_acf.json', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    if (data.length > 2000) {
      console.log(data.substring(0, 2000));
      process.exit(0);
    }
  });
});
