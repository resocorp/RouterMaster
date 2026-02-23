#!/bin/sh
# Copy staged config files into place and fix permissions.
# Windows Docker bind mounts are always world-writable; FreeRADIUS refuses to
# start with globally-writable config files. Copying to a tmpfs/overlay layer
# lets us set correct permissions.

copy_fix() {
    src="$1"
    dst="$2"
    if [ -f "$src" ]; then
        cp "$src" "$dst"
        chmod 640 "$dst"
        chown root:freerad "$dst" 2>/dev/null || chown root:root "$dst"
    fi
}

copy_fix /tmp/freeradius/clients.conf              /etc/freeradius/clients.conf
copy_fix /tmp/freeradius/mods-available/rest       /etc/freeradius/mods-available/rest
copy_fix /tmp/freeradius/mods-enabled/rest         /etc/freeradius/mods-enabled/rest
copy_fix /tmp/freeradius/sites-enabled/default     /etc/freeradius/sites-enabled/default
copy_fix /tmp/freeradius/sites-enabled/coa         /etc/freeradius/sites-enabled/coa

exec "$@"
