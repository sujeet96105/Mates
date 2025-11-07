# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Please add these rules to your existing keep rules in order to suppress warnings.
# This is generated automatically by the Android Gradle plugin.
-dontwarn com.gemalto.jp2.JP2Decoder
# Keep pdfbox android classes
-keep class com.tom_roush.** { *; }
-dontwarn com.tom_roush.**

# Ignore missing JPEG2000 decoder classes (allow PDFBox to compile without it)
-dontwarn com.gemalto.**
-dontwarn com.sun.media.imageioimpl.plugins.jpeg2000.**
-dontwarn org.jadice.**
-dontwarn javax.imageio.plugins.jpeg2000.**
-dontwarn com.tom_roush.pdfbox.filter.JPXFilter

# Keep PdfSaver native module
-keep class com.billbuddy.app.pdf.** { *; }