import * as L from "./lib/leaflet/leaflet-src.esm.js"

/**
 * This is the fix that prevent out of view Images/Marker to make the entire app lag/crash.
 *
 * This is directly copied from :
 * https://jsfiddle.net/n5rqfhg9/7
 */

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

/**
 * The game game is setup here, nothing much interesting happen here
 * except that the correct tile url allow to see terraforming.
 */

const tileURL = "https://launch-eu.lifmmo.com/maps/eu-big/{z}-{x}-{y}.webp"

const tileSize = 12 * 24
const worldSize = tileSize * 64
const worldSizeHalf = worldSize / 2

const bounds = L.latLngBounds([
  [0, 0],
  [worldSize, worldSize],
])

L.CRS.MySimple = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1 / 64, 0, -1 / 64, tileSize),
})

const layerConfig = {
  minZoom: 0,
  maxZoom: 9,
  maxNativeZoom: 6,
  tileSize,
  bounds,
  noWrap: true,
  mapservercount: 12,
  terrainCount: 24,
}

// Create world map
const map = L.map("game-map", {
  crs: L.CRS.MySimple,

  // Prevent dragging too far outside map bounds
  maxBounds: new L.latLngBounds(
    L.latLng(-worldSizeHalf, -worldSizeHalf),
    L.latLng(worldSize + worldSizeHalf, worldSize + worldSizeHalf)
  ),

  center: [worldSizeHalf, worldSizeHalf],
})

// Setup main background layer
const mainLayer = L.tileLayer(tileURL, layerConfig).addTo(map)
map.setView([worldSizeHalf, worldSizeHalf], 1)

mainLayer.getContainer().classList.add("pixelated-images")

// And guild layer
const guildsLayer = L.layerGroup().addTo(map)
const displayGuildsButton = document.getElementById("display-guilds-button")

displayGuildsButton.onclick = async function displayGuilds() {
  const response = await fetch("./data-guilds-02-08-23.json")
  if (!response.ok) return alert("ERROR: Cannot fetch guild data")

  const guilds = await response.json()

  for (const guild of guilds) {
    const guildId = guild.guildId

    const pointOptions = {
      type: "Feature",
      properties: {
        name: guild.name,
      },
      geometry: {
        type: "Point",
        coordinates: [guild.x, guild.y],
      },
    }

    L.geoJson(pointOptions, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: `https://region-eu.lifmmo.com/api/heraldy-api.php?guildid=${guildId}&worldid=eu-big&size=10`,
            iconSize: new L.Point(24, 24),
          }),
        })
      },
    }).addTo(guildsLayer)
  }

  displayGuildsButton.remove()
}
