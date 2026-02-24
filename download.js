import fs from 'fs';

const files = {
    'attieke.jpg': 'File:Atti%C3%A9k%C3%A9_et_poisson.jpg',
    'igname.jpg': 'File:Yams_at_a_market_in_Kumasi,_Ghana.jpg',
    'plantain.jpg': 'File:Plantains.jpg',
    'piment.jpg': 'File:Cayenne_pepper.jpg',
    'palme.jpg': 'File:Palm_oil.jpg',
    'poisson.jpg': 'File:Salted_fish.jpg'
};

async function download() {
    if (!fs.existsSync('public')) {
        fs.mkdirSync('public');
    }

    for (const [name, file] of Object.entries(files)) {
        try {
            const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${file}&prop=imageinfo&iiprop=url&format=json`;
            const res = await fetch(url, { headers: { 'User-Agent': 'OsoukAfrikApp/1.0 (test@example.com)' } });
            const data = await res.json();
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') {
                console.log(`Not found: ${file}`);
                continue;
            }
            const imgUrl = pages[pageId].imageinfo[0].url;
            console.log(`Downloading ${imgUrl} to public/${name}`);

            const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'OsoukAfrikApp/1.0 (test@example.com)' } });
            const buffer = await imgRes.arrayBuffer();
            fs.writeFileSync(`public/${name}`, Buffer.from(buffer));
            console.log(`Saved public/${name}`);
        } catch (e) {
            console.error(`Failed ${name}: ${e.message}`);
        }
    }
}

download();
