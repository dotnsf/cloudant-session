# Cloudant Session


## Overview

Sample application which use CouchDB(Cloudant) as session store.


## How to setup CouchDB on docker

- `$ docker run --name couchdb -e COUCHDB_USER=user -e COUCHDB_PASSWORD=pass -p 5984:5984 -d couchdb`

  - If you need persistant db, try ..
  
    - `$ mkdir -p /tmp/couchdb/data`
  
    - `$ docker run --name couchdb -e COUCHDB_USER=user -e COUCHDB_PASSWORD=pass -p 5984:5984  -v /tmp/couchdb/data:/opt/couchdb/data -d couchdb`

- `http://localhost:5984/_utils`

  - Login with `user`:`pass`

- Create `mydb` database


## References

https://www.npmjs.com/package/connect-cloudant-store


## Licensing

This code is licensed under MIT.


## Copyright

2023  [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.
