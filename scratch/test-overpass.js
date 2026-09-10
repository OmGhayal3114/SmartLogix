
const query = `[out:json];(node["amenity"="fuel"](around:1000,26.14,91.73,26.15,91.74););out;`;
const params = new URLSearchParams();
params.append("data", query);
fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  body: params,
  headers: { "User-Agent": "NER-SmartLogix/1.0" }
})
.then(r => r.text())
.then(data => console.log(data))
.catch(err => console.error(err.message));

