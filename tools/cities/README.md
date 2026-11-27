# The city directory

The API holds the cities of the thirteen supported countries itself (docs/adr/0006): the
directory "Your city" searches, and the list a looked-up postal code is resolved to.
`backend/src/Mondino.Infrastructure/Cities/cities.tsv.gz` is built by `build-cities.mjs` from
two GeoNames dumps, `cities15000` (every place of 15,000 people or more, less the sections of a city) and `admin1CodesASCII`
(the regions):

```sh
node tools/cities/build-cities.mjs <folder holding cities15000.txt and admin1CodesASCII.txt>
```

The data is from [GeoNames](https://www.geonames.org/), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
