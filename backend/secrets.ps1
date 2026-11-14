param(
  [Parameter(Mandatory=$true, Position=0)]
  [ValidateSet('store','read')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$target = 'CoolWips/AmeluApiKey'

$source = @'
using System;
using System.Runtime.InteropServices;

public static class CoolWipsCredentialStore {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    private struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }
    [DllImport("Advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern bool CredWrite(ref CREDENTIAL credential, uint flags);
    [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern bool CredRead(string target, uint type, uint flags, out IntPtr credential);
    [DllImport("Advapi32.dll", SetLastError=false)]
    private static extern void CredFree(IntPtr buffer);
    public static bool Write(string target, string user, IntPtr secret, int chars) {
        var c = new CREDENTIAL(); c.Type=1; c.TargetName=target; c.UserName=user;
        c.CredentialBlob=secret; c.CredentialBlobSize=(uint)(chars*2); c.Persist=2;
        return CredWrite(ref c,0);
    }
    public static string Read(string target) {
        IntPtr pointer; if (!CredRead(target,1,0,out pointer)) return null;
        try { var c=(CREDENTIAL)Marshal.PtrToStructure(pointer,typeof(CREDENTIAL)); return Marshal.PtrToStringUni(c.CredentialBlob,(int)c.CredentialBlobSize/2); }
        finally { CredFree(pointer); }
    }
}
'@

if (-not ('CoolWipsCredentialStore' -as [type])) { Add-Type -TypeDefinition $source }

if ($Action -eq 'store') {
  $secure = Read-Host 'Paste the Amelu server API key (input is hidden)' -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($secure)
  try {
    if (-not [CoolWipsCredentialStore]::Write($target,'Amelu server mail',$pointer,$secure.Length)) {
      throw [ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error())
    }
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeCoTaskMemUnicode($pointer)
    $secure.Dispose()
  }
  Write-Output 'Credential saved in this Windows user Credential Manager.'
} elseif ($Action -eq 'read') {
  $value = [CoolWipsCredentialStore]::Read($target)
  if ([string]::IsNullOrEmpty($value)) { exit 2 }
  [Console]::Out.Write($value)
}

