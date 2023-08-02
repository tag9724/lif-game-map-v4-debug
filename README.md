# Life is Feudal - Game map fix Proof of Concept

The in-game map of Life is Feudal MMO cause many lag and crash issues due to the amount of informations displayed, typically guilds monuments and outposts, by using virtualisation technique that remove from the dom every map marker out of view we can fix the issue entirely.

The code used for the fix is a slightly modified version of this one : 
- With the fix enabled https://jsfiddle.net/n5rqfhg9/7 
- Without the fix enabled https://jsfiddle.net/n5rqfhg9/7 

The only thing to do is to copy this block of code at the beginning of the game map script

```js
L.Marker.addInitHook(function () {
  // setup virtualization after marker was added
  this.on(
    "add",
    function () {
      this._updateIconVisibility = function () {
        var map = this._map,
          isVisible = map.getBounds().contains(this.getLatLng()),
          wasVisible = this._wasVisible,
          icon = this._icon,
          iconParent = this._iconParent,
          shadow = this._shadow,
          shadowParent = this._shadowParent

        // remember parent of icon
        if (!iconParent) {
          iconParent = this._iconParent = icon.parentNode
        }
        if (shadow && !shadowParent) {
          shadowParent = this._shadowParent = shadow.parentNode
        }

        // add/remove from DOM on change
        if (isVisible != wasVisible) {
          if (isVisible) {
            iconParent.appendChild(icon)
            if (shadow) {
              shadowParent.appendChild(shadow)
            }
          } else {
            iconParent.removeChild(icon)
            if (shadow) {
              shadowParent.removeChild(shadow)
            }
          }

          this._wasVisible = isVisible
        }
      }

      // on map size change, remove/add icon from/to DOM
      this._map.on("resize moveend zoomend", this._updateIconVisibility, this)

      /**
       * This is a extra, it update icon visibility while moving on the map
       * instead of waiting for pointer release
       *
       * It is debounced, change "maxUpdateInterval" for quicker or slower refresh
       * (slower value is more smooth but lag more, value in ms)
       */

      const maxUpdateInterval = 500
      let nextAllowedUpdate = 0

      const updateIconVisibilityDebounced = () => {
        const now = Date.now()

        if (nextAllowedUpdate < now) {
          nextAllowedUpdate = now + maxUpdateInterval
          this._updateIconVisibility()
        }
      }

      this._map.on("move", updateIconVisibilityDebounced, this)
    },
    this
  )
})

```