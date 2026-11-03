$ErrorActionPreference='Stop'
$ProgressPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
try {
 Add-Type -AssemblyName System.Runtime.WindowsRuntime
 $null=[Windows.Devices.Radios.Radio,Windows.System.Devices,ContentType=WindowsRuntime]
 function Await($operation,$type){$method=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'}|Select-Object -First 1;$task=$method.MakeGenericMethod($type).Invoke($null,@($operation));if(!$task.Wait(20000)){throw 'Il dispositivo non ha risposto entro il tempo previsto.'};return $task.Result}
 $request=[Console]::In.ReadToEnd()|ConvertFrom-Json
 switch($request.action){
  'radios' {$radios=Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]]);$result=@($radios|ForEach-Object {@{name=$_.Name;kind=[string]$_.Kind;state=[string]$_.State}})}
  'radio' {$radios=Await ([Windows.Devices.Radios.Radio]::GetRadiosAsync()) ([System.Collections.Generic.IReadOnlyList[Windows.Devices.Radios.Radio]]);$matching=@($radios|Where-Object {[string]$_.Kind -eq [string]$request.kind});if(!$matching.Count){throw 'Adattatore non presente.'};$state=if($request.enabled){[Windows.Devices.Radios.RadioState]::On}else{[Windows.Devices.Radios.RadioState]::Off};foreach($radio in $matching){$answer=Await ($radio.SetStateAsync($state)) ([Windows.Devices.Radios.RadioAccessStatus]);if([string]$answer -ne 'Allowed'){throw ('Windows non consente il cambio di stato: '+$answer)}};$result='Stato aggiornato.'}
  default {throw 'Comando non riconosciuto.'}
 }
 @{ok=$true;result=$result}|ConvertTo-Json -Depth 8 -Compress
}catch{@{ok=$false;error=$_.Exception.GetBaseException().Message}|ConvertTo-Json -Compress}
