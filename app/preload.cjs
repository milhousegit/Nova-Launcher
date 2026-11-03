const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('nova',{call:(action,payload={})=>ipcRenderer.invoke('nova',action,payload),onUpdate:cb=>ipcRenderer.on('nova:update',(_,value)=>cb(value))});
