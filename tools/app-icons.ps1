param([Parameter(Mandatory=$true)][string]$DataPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName WindowsBase,PresentationCore
Add-Type @"
using System;using System.Runtime.InteropServices;
public static class NovaAppIcons {
 [StructLayout(LayoutKind.Sequential)] public struct SIZE {public int cx;public int cy;}
 [ComImport,Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IImageFactory {[PreserveSig]int GetImage(SIZE size,uint flags,out IntPtr bitmap);}
 [DllImport("shell32.dll",CharSet=CharSet.Unicode,PreserveSig=true)] static extern int SHCreateItemFromParsingName(string path,IntPtr bind,ref Guid iid,[MarshalAs(UnmanagedType.Interface)]out IImageFactory item);
 [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr bitmap);
 public static IntPtr Extract(string name){IImageFactory factory=null;Guid iid=new Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b");try{int hr=SHCreateItemFromParsingName(name,IntPtr.Zero,ref iid,out factory);if(hr<0)return IntPtr.Zero;IntPtr bitmap;hr=factory.GetImage(new SIZE{cx=256,cy=256},0x104,out bitmap);return hr<0?IntPtr.Zero:bitmap;}finally{if(factory!=null)Marshal.ReleaseComObject(factory);}}
}
"@
$novaIconDirectory=Join-Path $DataPath 'app-icons'
[IO.Directory]::CreateDirectory($novaIconDirectory)|Out-Null
$novaIconApps=Get-Content -LiteralPath (Join-Path $DataPath 'app-icon-requests.json') -Raw | ConvertFrom-Json
$novaIconResults=@{}
foreach($novaIconApp in $novaIconApps){
 $novaIconHash=[Security.Cryptography.SHA256]::Create()
 try{$novaIconName=([BitConverter]::ToString($novaIconHash.ComputeHash([Text.Encoding]::UTF8.GetBytes($novaIconApp.id)))).Replace('-','').ToLowerInvariant()+'.png'}finally{$novaIconHash.Dispose()}
 $novaIconOutput=Join-Path $novaIconDirectory $novaIconName
 if(-not (Test-Path -LiteralPath $novaIconOutput)){
  $novaBitmap=[IntPtr]::Zero
  try{
   $novaBitmap=[NovaAppIcons]::Extract('shell:AppsFolder\'+$novaIconApp.id)
   if($novaBitmap -eq [IntPtr]::Zero){continue}
   $novaSource=[Windows.Interop.Imaging]::CreateBitmapSourceFromHBitmap($novaBitmap,[IntPtr]::Zero,[Windows.Int32Rect]::Empty,[Windows.Media.Imaging.BitmapSizeOptions]::FromEmptyOptions())
   $novaEncoder=New-Object Windows.Media.Imaging.PngBitmapEncoder
   $novaEncoder.Frames.Add([Windows.Media.Imaging.BitmapFrame]::Create($novaSource))
   $novaStream=[IO.File]::Open($novaIconOutput,[IO.FileMode]::Create)
   try{$novaEncoder.Save($novaStream)}finally{$novaStream.Dispose()}
  }catch{continue}finally{if($novaBitmap -ne [IntPtr]::Zero){[NovaAppIcons]::DeleteObject($novaBitmap)|Out-Null}}
 }
 if(Test-Path -LiteralPath $novaIconOutput){$novaIconResults[$novaIconApp.id]=$novaIconName}
}
$novaIconResults|ConvertTo-Json -Compress|Set-Content -LiteralPath (Join-Path $DataPath 'app-icons.json') -Encoding UTF8
Write-Output ($novaIconResults.Count)
