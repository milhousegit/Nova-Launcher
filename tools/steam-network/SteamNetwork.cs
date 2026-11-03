using System;
using System.IO;
using System.IO.Pipes;
using System.Diagnostics;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using Microsoft.Win32;

// Own dynamic WFP session: no persisted firewall rules, services or drivers.
class SteamNetwork {
 [StructLayout(LayoutKind.Sequential)] struct Display { [MarshalAs(UnmanagedType.LPWStr)] public string name; public IntPtr description; }
 [StructLayout(LayoutKind.Sequential)] struct Blob { public uint size; public IntPtr data; }
 [StructLayout(LayoutKind.Explicit, Size=16)] struct Value { [FieldOffset(0)] public uint type; [FieldOffset(8)] public IntPtr pointer; }
 [StructLayout(LayoutKind.Sequential)] struct Session { public Guid key; public Display display; public uint flags,timeout,pid; public IntPtr sid,user; public int kernel; }
 [StructLayout(LayoutKind.Sequential)] struct Condition { public Guid field; public uint match; public Value value; }
 [StructLayout(LayoutKind.Sequential)] struct Action { public uint type; public Guid key; }
 [StructLayout(LayoutKind.Explicit,Size=16)] struct Context { [FieldOffset(0)] public ulong raw; [FieldOffset(0)] public Guid key; }
 [StructLayout(LayoutKind.Sequential)] struct Filter { public Guid key; public Display display; public uint flags; public IntPtr provider; public Blob data; public Guid layer,sublayer; public Value weight; public uint count; public IntPtr conditions; public Action action; public Context context; public IntPtr reserved; public ulong id; public Value effective; }
 [DllImport("fwpuclnt.dll",CharSet=CharSet.Unicode)] static extern uint FwpmEngineOpen0(string server,uint auth,IntPtr identity,ref Session session,out IntPtr engine);
 [DllImport("fwpuclnt.dll")] static extern uint FwpmEngineClose0(IntPtr engine);
 [DllImport("fwpuclnt.dll")] static extern uint FwpmTransactionBegin0(IntPtr engine,uint flags);
 [DllImport("fwpuclnt.dll")] static extern uint FwpmTransactionCommit0(IntPtr engine);
 [DllImport("fwpuclnt.dll")] static extern uint FwpmTransactionAbort0(IntPtr engine);
 [DllImport("fwpuclnt.dll",CharSet=CharSet.Unicode)] static extern uint FwpmGetAppIdFromFileName0(string file,out IntPtr id);
 [DllImport("fwpuclnt.dll")] static extern uint FwpmFilterAdd0(IntPtr engine,ref Filter filter,IntPtr sd,out ulong id);
 [DllImport("fwpuclnt.dll")] static extern uint FwpmFilterGetByKey0(IntPtr engine,ref Guid key,out IntPtr filter);
 [DllImport("fwpuclnt.dll")] static extern void FwpmFreeMemory0(ref IntPtr memory);
 static Guid appId=new Guid("d78e1e87-8644-4ea5-9437-d809ecefc971"),universal=new Guid("eebecc03-ced4-4380-819a-2734397b2b74");
 static Guid[] layers={new Guid("c38d57d1-05a7-4c33-904f-7fbceee60e82"),new Guid("4a72393b-319f-44bc-84c3-ba54dcb3b6b4"),new Guid("e1cd9fe7-f4b5-4273-96c0-592e487b8650"),new Guid("a3b42c97-9f04-4672-b87e-cee9c483257f")};
 static void Check(uint code){if(code!=0)throw new Exception("WFP 0x"+code.ToString("X8"));}
 static Session DynamicSession(){return new Session{key=Guid.NewGuid(),display=new Display{name="Nova - Steam temporaneamente senza rete"},flags=1};}
 static List<string> Paths(){
  var roots=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  foreach(var key in new[]{@"HKEY_CURRENT_USER\Software\Valve\Steam",@"HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Valve\Steam",@"HKEY_LOCAL_MACHINE\SOFTWARE\Valve\Steam"})foreach(var name in new[]{"SteamPath","InstallPath"}){try{var p=Registry.GetValue(key,name,null) as string;if(!String.IsNullOrEmpty(p))roots.Add(Path.GetFullPath(p));}catch(System.Security.SecurityException){}}
  roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Steam"));
  var found=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
  foreach(var root in roots)if(File.Exists(Path.Combine(root,"steam.exe")))foreach(var name in new[]{"steam.exe","GameOverlayUI.exe","steamerrorreporter.exe","steamerrorreporter64.exe",@"bin\SteamService.exe",@"bin\cef\cef.win64\steamwebhelper.exe",@"bin\cef\cef.win7\steamwebhelper.exe"}){var file=Path.GetFullPath(Path.Combine(root,name));if(File.Exists(file))found.Add(file);}
  var service=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonProgramFilesX86),@"Steam\SteamService.exe");if(File.Exists(service))found.Add(service);
  if(found.Count==0)throw new Exception("Steam non trovato su questo PC.");return new List<string>(found);
 }
 static List<Guid> Install(IntPtr engine,List<string> files){
  var keys=new List<Guid>();Check(FwpmTransactionBegin0(engine,0));
  try{foreach(var file in files){IntPtr blob=IntPtr.Zero,condition=IntPtr.Zero;try{
    Check(FwpmGetAppIdFromFileName0(file,out blob));
    var c=new Condition{field=appId,match=0,value=new Value{type=12,pointer=blob}};
    condition=Marshal.AllocHGlobal(Marshal.SizeOf(typeof(Condition)));Marshal.StructureToPtr(c,condition,false);
    foreach(var layer in layers){var f=new Filter{key=Guid.NewGuid(),display=new Display{name="Nova Steam: "+Path.GetFileName(file)},layer=layer,sublayer=universal,count=1,conditions=condition,action=new Action{type=0x1001}};ulong id;Check(FwpmFilterAdd0(engine,ref f,IntPtr.Zero,out id));keys.Add(f.key);}
   }finally{if(condition!=IntPtr.Zero)Marshal.FreeHGlobal(condition);if(blob!=IntPtr.Zero)FwpmFreeMemory0(ref blob);}}
   Check(FwpmTransactionCommit0(engine));return keys;
  }catch{FwpmTransactionAbort0(engine);throw;}
 }
 static void Close(ref IntPtr engine){if(engine!=IntPtr.Zero){Check(FwpmEngineClose0(engine));engine=IntPtr.Zero;}}
 static int Main(string[] args){
  IntPtr engine=IntPtr.Zero;
  try{
   if(args.Length==1&&args[0]=="--inspect"){Console.WriteLine("Filter="+Marshal.SizeOf(typeof(Filter))+" Condition="+Marshal.SizeOf(typeof(Condition))+" Session="+Marshal.SizeOf(typeof(Session)));foreach(var p in Paths())Console.WriteLine(p);return 0;}
   if(args.Length==1&&args[0]=="--self-test"){
    var s=DynamicSession();Check(FwpmEngineOpen0(null,10,IntPtr.Zero,ref s,out engine));var keys=Install(engine,Paths());Close(ref engine);
    s=DynamicSession();Check(FwpmEngineOpen0(null,10,IntPtr.Zero,ref s,out engine));foreach(var k in keys){var key=k;IntPtr f;uint result=FwpmFilterGetByKey0(engine,ref key,out f);if(f!=IntPtr.Zero)FwpmFreeMemory0(ref f);if(result!=0x80320003)throw new Exception("Filtro non rimosso: "+result);}
    Console.WriteLine("PASS: "+keys.Count+" filtri IPv4/IPv6 Steam installati e rimossi alla chiusura della sessione dinamica.");return 0;
   }
   if(args.Length!=2||!System.Text.RegularExpressions.Regex.IsMatch(args[1],"^nova-steam-[a-f0-9]{32}$"))return 2;
   using(var parent=Process.GetProcessById(Int32.Parse(args[0]))){
    // Hold the actual parent process handle; PID reuse cannot extend this session.
    var handle=parent.Handle;if(parent.ProcessName!="NOVA")return 3;
    var security=new PipeSecurity();security.SetAccessRuleProtection(true,false);
    security.AddAccessRule(new PipeAccessRule(WindowsIdentity.GetCurrent().User,PipeAccessRights.FullControl,AccessControlType.Allow));
    using(var pipe=new NamedPipeServerStream(args[1],PipeDirection.InOut,1,PipeTransmissionMode.Byte,PipeOptions.Asynchronous,4096,4096,security)){
     var pending=pipe.BeginWaitForConnection(null,null);var deadline=DateTime.UtcNow.AddSeconds(30);
     while(!pending.AsyncWaitHandle.WaitOne(200)){if(parent.HasExited||DateTime.UtcNow>deadline)return 4;}pipe.EndWaitForConnection(pending);
     using(var reader=new StreamReader(pipe))using(var writer=new StreamWriter(pipe)){writer.AutoFlush=true;
      try{
       // No arbitrary path/command is accepted over the pipe.
       var s=DynamicSession();Check(FwpmEngineOpen0(null,10,IntPtr.Zero,ref s,out engine));var paths=Paths();var keys=Install(engine,paths);
       writer.WriteLine("READY:"+paths.Count+":"+keys.Count);
       var read=reader.ReadLineAsync();while(!read.Wait(200)){if(parent.HasExited){Close(ref engine);return 0;}}
       Close(ref engine);if(read.Result=="STOP")writer.WriteLine("STOPPED");
      }catch(Exception e){Close(ref engine);writer.WriteLine("ERROR:"+e.Message);}
     }
    }
   }return 0;
  }catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}finally{if(engine!=IntPtr.Zero)FwpmEngineClose0(engine);}
 }
}
