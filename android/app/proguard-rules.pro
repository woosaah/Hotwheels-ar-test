# React Native ProGuard Rules

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Vision Camera
-keep class com.mrousavy.camera.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp *;
}
