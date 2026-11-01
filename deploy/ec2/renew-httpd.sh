#!/bin/sh
set -eu
/usr/sbin/httpd -t
/usr/bin/systemctl reload httpd
