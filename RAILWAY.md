## Railway persistent disk (paid plans only)
## Mount this volume at the same path as STORAGE_LOCAL_PATH so uploaded
## files survive redeploys. If you skip this, multer writes to ephemeral
## container storage and uploads vanish on every redeploy.
##
## In the Railway dashboard:
##   Service -> Variables -> Add Volume
##   Mount path: /app/uploads
##   Size: 1 GB
##
## Then ensure STORAGE_LOCAL_PATH=/app/uploads in the service env.
