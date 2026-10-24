# Add project specific ProGuard rules here.
# Capacitor's consumer rules retain plugin classes and annotated callbacks.
# Retain the WebView bridge methods called by JavaScript rather than Java.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
# Tink (via AndroidX Security) references optional compile-time annotations.
-dontwarn javax.annotation.Nullable
-dontwarn javax.annotation.concurrent.GuardedBy
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
