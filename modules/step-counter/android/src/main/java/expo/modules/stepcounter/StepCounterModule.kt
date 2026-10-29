package expo.modules.stepcounter

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads the step counter sensor: the steps taken since the phone was switched on, counted by the
 * phone itself even while the app is closed. One reading per call, then the sensor is let go.
 */
class StepCounterModule : Module() {
  private val sensors: SensorManager?
    get() = appContext.reactContext?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  override fun definition() = ModuleDefinition {
    Name("StepCounter")

    Function("isAvailable") {
      sensors?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
    }

    AsyncFunction("read") { promise: Promise ->
      val manager = sensors
      val sensor = manager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
      if (manager == null || sensor == null) {
        promise.resolve(null)
      } else {
        var settled = false
        val listener = object : SensorEventListener {
          override fun onSensorChanged(event: SensorEvent) {
            if (settled) return
            settled = true
            manager.unregisterListener(this)
            val bootTime = System.currentTimeMillis() - SystemClock.elapsedRealtime()
            promise.resolve(mapOf("steps" to event.values[0].toDouble(), "bootTime" to bootTime.toDouble()))
          }

          override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
        }
        manager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        // No reading (no permission, or the sensor is asleep): give up after a few seconds.
        Handler(Looper.getMainLooper()).postDelayed({
          if (!settled) {
            settled = true
            manager.unregisterListener(listener)
            promise.resolve(null)
          }
        }, 4000)
      }
    }
  }
}
