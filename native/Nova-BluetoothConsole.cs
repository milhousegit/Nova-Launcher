using System;using System.Collections.Generic;using System.Runtime.InteropServices;using System.Threading.Tasks;
namespace WinhancedBridge
{
 internal static class BluetoothNative
 {
  [StructLayout(LayoutKind.Sequential)]internal struct Time{public ushort Year,Month,DayOfWeek,Day,Hour,Minute,Second,Milliseconds;}
  [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]internal struct Device{public uint Size;public ulong Address;public uint Class;public int Connected,Remembered,Authenticated;public Time Seen,Used;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=248)]public string Name;}
  [StructLayout(LayoutKind.Sequential)]struct Search{public uint Size;public int Authenticated,Remembered,Unknown,Connected,Inquiry;public byte Timeout;public IntPtr Radio;}
  [DllImport("bthprops.cpl",SetLastError=true)]static extern IntPtr BluetoothFindFirstDevice(ref Search search,ref Device device);
  [DllImport("bthprops.cpl",SetLastError=true)]static extern bool BluetoothFindNextDevice(IntPtr find,ref Device device);
  [DllImport("bthprops.cpl")]static extern bool BluetoothFindDeviceClose(IntPtr find);
  [DllImport("bthprops.cpl")]static extern uint BluetoothAuthenticateDeviceEx(IntPtr owner,IntPtr radio,ref Device device,IntPtr data,uint requirements);
  [DllImport("bthprops.cpl")]static extern uint BluetoothRemoveDevice(ref ulong address);
  internal static List<Device> Devices(bool discover){var search=new Search{Size=(uint)Marshal.SizeOf(typeof(Search)),Authenticated=1,Remembered=1,Unknown=1,Connected=1,Inquiry=discover?1:0,Timeout=4};var info=new Device{Size=(uint)Marshal.SizeOf(typeof(Device))};var result=new List<Device>();var find=BluetoothFindFirstDevice(ref search,ref info);if(find==IntPtr.Zero){var error=Marshal.GetLastWin32Error();if(error!=0&&error!=259&&error!=1168)throw new System.ComponentModel.Win32Exception(error);return result;}try{do{result.Add(info);info=new Device{Size=(uint)Marshal.SizeOf(typeof(Device))};}while(BluetoothFindNextDevice(find,ref info));}finally{BluetoothFindDeviceClose(find);}return result;}
  internal static void Pair(IntPtr owner,Device device){var result=BluetoothAuthenticateDeviceEx(owner,IntPtr.Zero,ref device,IntPtr.Zero,0);if(result!=0)throw new System.ComponentModel.Win32Exception((int)result);}
  internal static void Unpair(Device device){var address=device.Address;var result=BluetoothRemoveDevice(ref address);if(result!=0)throw new System.ComponentModel.Win32Exception((int)result);}
 }
}