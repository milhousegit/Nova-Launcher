// Discord voice through the local Discord client (RPC over its named pipe).
// Gives servers with icons, voice channels with who is inside, the current call (server, group or private),
// joining/leaving and microphone control. Needs the rpc scopes and a running Discord client.
using System;using System.IO;using System.IO.Pipes;using System.Linq;using System.Text;using System.Collections;using System.Collections.Generic;using System.Collections.Concurrent;using System.Threading;
partial class DiscordAdapter
{
 static bool HasVoiceScope(string scopes){var set=(scopes??"").Split(new[]{' ',','},StringSplitOptions.RemoveEmptyEntries);return set.Contains("rpc")&&set.Contains("rpc.voice.read");}
 static readonly object voiceLock=new object();static Thread voiceThread;static RpcClient rpc;static string voiceError="",resultId="",resultError="";static bool resultOk=true;
 static List<Dictionary<string,object>> guildList=new List<Dictionary<string,object>>();static bool guildsLoaded;static Dictionary<string,object> currentCall;static bool selfMute,selfDeaf;
 static string watchGuild="";static DateTime watchUntil=DateTime.MinValue,nextState=DateTime.MinValue,nextGuilds=DateTime.MinValue,nextMembers=DateTime.MinValue,nextConnect=DateTime.MinValue;
 static void StartVoice(){if(voiceThread!=null)return;Json.MaxJsonLength=16*1024*1024;voiceThread=new Thread(VoiceLoop);voiceThread.IsBackground=true;voiceThread.Name="NovaDiscordVoice";voiceThread.Start();}

 static object Dig(object node,params string[] path){foreach(var key in path){var d=node as Dictionary<string,object>;if(d==null||!d.ContainsKey(key))return null;node=d[key];}return node;}
 static string S(object v){return v==null?"":Convert.ToString(v);}
 static string Field(Dictionary<string,object> d,string key){return d!=null&&d.ContainsKey(key)?S(d[key]):"";}
 static bool Flag(Dictionary<string,object> d,string key){return d!=null&&d.ContainsKey(key)&&d[key] is bool&&(bool)d[key];}
 static IEnumerable<Dictionary<string,object>> Items(object value){var list=value as IEnumerable;if(list==null||value is string)yield break;foreach(var x in list){var d=x as Dictionary<string,object>;if(d!=null)yield return d;}}
 static string AvatarUrl(Dictionary<string,object> user){var id=Field(user,"id");var hash=Field(user,"avatar");if(hash!="")return "https://cdn.discordapp.com/avatars/"+id+"/"+hash+(hash.StartsWith("a_")?".gif":".png")+"?size=64";ulong n;int index=ulong.TryParse(id,out n)?(int)((n>>22)%6):0;return "https://cdn.discordapp.com/embed/avatars/"+index+".png";}
 static Dictionary<string,object> Member(Dictionary<string,object> entry){var user=Dig(entry,"user") as Dictionary<string,object>;if(user==null)return null;var state=Dig(entry,"voice_state") as Dictionary<string,object>;var name=Field(entry,"nick");if(name=="")name=Field(user,"global_name");if(name=="")name=Field(user,"username");return new Dictionary<string,object>{{"id",Field(user,"id")},{"name",name},{"avatar",AvatarUrl(user)},{"mute",Flag(state,"self_mute")||Flag(state,"mute")||Flag(entry,"mute")},{"deaf",Flag(state,"self_deaf")||Flag(state,"deaf")}};}
 static List<object> Members(Dictionary<string,object> channel){var list=new List<object>();foreach(var entry in Items(channel.ContainsKey("voice_states")?channel["voice_states"]:null)){var m=Member(entry);if(m!=null)list.Add(m);}return list;}

 sealed class RpcClient:IDisposable
 {
  NamedPipeClientStream pipe;Thread reader;readonly BlockingCollection<Dictionary<string,object>> inbox=new BlockingCollection<Dictionary<string,object>>();public volatile bool Alive;readonly object writeLock=new object();
  public static RpcClient Open(string clientId){NamedPipeClientStream found=null;var forced=Environment.GetEnvironmentVariable("NOVA_DISCORD_IPC");for(int i=0;i<10&&found==null;i++){var p=new NamedPipeClientStream(".",string.IsNullOrEmpty(forced)?"discord-ipc-"+i:forced,PipeDirection.InOut,PipeOptions.Asynchronous);try{p.Connect(300);found=p;}catch{p.Dispose();}}if(found==null)throw new Exception("Discord non è aperto sul PC.");var c=new RpcClient();c.pipe=found;c.Alive=true;c.reader=new Thread(c.ReadLoop);c.reader.IsBackground=true;c.reader.Start();try{c.Send(0,new Dictionary<string,object>{{"v",1},{"client_id",clientId}});c.Wait(m=>Field(m,"evt")=="READY",15000);return c;}catch{c.Dispose();throw;}}
  void Send(int op,object payload){var body=Encoding.UTF8.GetBytes(Json.Serialize(payload));var frame=new byte[8+body.Length];BitConverter.GetBytes(op).CopyTo(frame,0);BitConverter.GetBytes(body.Length).CopyTo(frame,4);Buffer.BlockCopy(body,0,frame,8,body.Length);lock(writeLock){pipe.Write(frame,0,frame.Length);pipe.Flush();}}
  void ReadFully(byte[] buffer,int count){int read=0;while(read<count){int n=pipe.Read(buffer,read,count-read);if(n<=0)throw new IOException("closed");read+=n;}}
  void ReadLoop(){try{var head=new byte[8];while(true){ReadFully(head,8);int op=BitConverter.ToInt32(head,0),len=BitConverter.ToInt32(head,4);if(len<0||len>16000000)throw new Exception("Frame Discord non valido");var body=new byte[len];ReadFully(body,len);var text=Encoding.UTF8.GetString(body);if(op==3){Send(4,Json.Deserialize<Dictionary<string,object>>(text));continue;}if(op==2)break;inbox.Add(Json.Deserialize<Dictionary<string,object>>(text));}}catch{}Alive=false;try{inbox.Add(new Dictionary<string,object>{{"evt","CLOSED"}});}catch{}}
  Dictionary<string,object> Wait(Func<Dictionary<string,object>,bool> match,int timeout){var until=DateTime.UtcNow.AddMilliseconds(timeout);while(true){int left=(int)(until-DateTime.UtcNow).TotalMilliseconds;if(left<=0)throw new TimeoutException("Discord non risponde.");Dictionary<string,object> msg;if(!inbox.TryTake(out msg,left))throw new TimeoutException("Discord non risponde.");if(Field(msg,"evt")=="CLOSED")throw new IOException("Discord ha chiuso il collegamento.");if(Field(msg,"evt")=="ERROR"&&Field(msg,"nonce")=="")throw new Exception(Field(Dig(msg,"data") as Dictionary<string,object>,"message"));if(match(msg))return msg;}}
  public object Call(string cmd,Dictionary<string,object> args=null,int timeout=7000){var nonce=Guid.NewGuid().ToString();Send(1,new Dictionary<string,object>{{"cmd",cmd},{"args",args??new Dictionary<string,object>()},{"nonce",nonce}});var msg=Wait(m=>Field(m,"nonce")==nonce,timeout);if(Field(msg,"evt")=="ERROR")throw new Exception(Field(Dig(msg,"data") as Dictionary<string,object>,"message"));return msg.ContainsKey("data")?msg["data"]:null;}
  public void Dispose(){Alive=false;try{pipe.Dispose();}catch{}}
 }

 static void SetVoiceError(string message){lock(voiceLock){voiceError=message;}}
 static void Connect(){var client=RpcClient.Open(application.ToString());try{client.Call("AUTHENTICATE",new Dictionary<string,object>{{"access_token",accessToken}});}catch(Exception e){client.Dispose();throw new Exception("Discord ha rifiutato l’accesso vocale ("+e.Message+"). Ricollega Discord per riattivarlo.");}rpc=client;SetVoiceError("");nextState=DateTime.MinValue;nextGuilds=DateTime.MinValue;}
 static Dictionary<string,object> ChannelInfo(Dictionary<string,object> channel){var members=Members(channel);var type=channel.ContainsKey("type")?Convert.ToInt32(channel["type"]):0;var name=Field(channel,"name");if(name==""&&members.Count>0)name=string.Join(", ",members.Take(3).Select(m=>Field((Dictionary<string,object>)m,"name")));return new Dictionary<string,object>{{"id",Field(channel,"id")},{"name",name},{"type",type},{"guildId",Field(channel,"guild_id")},{"stage",type==13},{"members",members}};}
 static void RefreshCall(){var data=rpc.Call("GET_SELECTED_VOICE_CHANNEL") as Dictionary<string,object>;var settings=rpc.Call("GET_VOICE_SETTINGS") as Dictionary<string,object>;var info=data==null?null:ChannelInfo(data);lock(voiceLock){selfMute=Flag(settings,"mute");selfDeaf=Flag(settings,"deaf");currentCall=info;}}
 static void RefreshGuilds(){var data=rpc.Call("GET_GUILDS") as Dictionary<string,object>;var previous=guildList.SelectMany(g=>((List<object>)g["channels"]).Cast<Dictionary<string,object>>()).ToDictionary(c=>Field(c,"id"),c=>c,StringComparer.Ordinal);var result=new List<Dictionary<string,object>>();int count=0;foreach(var guild in Items(data==null?null:Dig(data,"guilds"))){if(count++>=80)break;var channels=new List<object>();try{var listing=rpc.Call("GET_CHANNELS",new Dictionary<string,object>{{"guild_id",Field(guild,"id")}}) as Dictionary<string,object>;foreach(var channel in Items(listing==null?null:Dig(listing,"channels"))){var type=channel.ContainsKey("type")?Convert.ToInt32(channel["type"]):0;if(type!=2&&type!=13)continue;var id=Field(channel,"id");Dictionary<string,object> old;channels.Add(new Dictionary<string,object>{{"id",id},{"name",Field(channel,"name")},{"stage",type==13},{"members",previous.TryGetValue(id,out old)?old["members"]:new List<object>()}});}}catch{}
   result.Add(new Dictionary<string,object>{{"id",Field(guild,"id")},{"name",Field(guild,"name")},{"icon",Field(guild,"icon_url")},{"channels",channels}});}
  lock(voiceLock){guildList=result;guildsLoaded=true;}}
 static void RefreshMembers(string guildId){List<Dictionary<string,object>> channels;lock(voiceLock){var guild=guildList.FirstOrDefault(g=>Field(g,"id")==guildId);channels=guild==null?new List<Dictionary<string,object>>():((List<object>)guild["channels"]).Cast<Dictionary<string,object>>().Take(40).ToList();}
  foreach(var channel in channels){try{var data=rpc.Call("GET_CHANNEL",new Dictionary<string,object>{{"channel_id",Field(channel,"id")}}) as Dictionary<string,object>;if(data==null)continue;var members=Members(data);lock(voiceLock){channel["members"]=members;}}catch{}}}
 static void HandleCommand(){var file=Path.Combine(directory,"discord-command.json");if(!File.Exists(file))return;string text;try{text=File.ReadAllText(file);File.Delete(file);}catch{return;}Dictionary<string,object> cmd;try{cmd=Json.Deserialize<Dictionary<string,object>>(text);}catch{return;}
  lock(voiceLock){resultId=Field(cmd,"id");resultOk=true;resultError="";}
  try{switch(Field(cmd,"action")){
   case "guilds":nextGuilds=DateTime.MinValue;break;
   case "members":lock(voiceLock){watchGuild=Field(cmd,"guild");watchUntil=DateTime.UtcNow.AddSeconds(25);}nextMembers=DateTime.MinValue;break;
   case "join":rpc.Call("SELECT_VOICE_CHANNEL",new Dictionary<string,object>{{"channel_id",Field(cmd,"channel")},{"force",true}},15000);RefreshCall();break;
   case "leave":rpc.Call("SELECT_VOICE_CHANNEL",new Dictionary<string,object>{{"channel_id",null}},10000);RefreshCall();break;
   case "mute":rpc.Call("SET_VOICE_SETTINGS",new Dictionary<string,object>{{"mute",Flag(cmd,"value")}});RefreshCall();break;
   case "deafen":rpc.Call("SET_VOICE_SETTINGS",new Dictionary<string,object>{{"deaf",Flag(cmd,"value")}});RefreshCall();break;
   default:throw new Exception("Comando non supportato.");}}
  catch(Exception e){lock(voiceLock){resultOk=false;resultError=e.Message;}}}
 static void WriteVoice(){try{string text;lock(voiceLock){var state=new Dictionary<string,object>{{"updated",DateTime.UtcNow.ToString("O")},{"capable",voice},{"ready",rpc!=null&&rpc.Alive},{"guildsLoaded",guildsLoaded},{"guilds",guildList},{"call",currentCall},{"selfMute",selfMute},{"selfDeaf",selfDeaf},{"error",voiceError},{"result",new Dictionary<string,object>{{"id",resultId},{"ok",resultOk},{"error",resultError}}}};text=Json.Serialize(state);}
  var f=Path.Combine(directory,"discord-voice.json");File.WriteAllText(f+".tmp",text);if(File.Exists(f))File.Delete(f);File.Move(f+".tmp",f);}catch{}}
 static void VoiceLoop(){
  while(!stop){
   try{
    if(rpc==null||!rpc.Alive){if(DateTime.UtcNow<nextConnect){Thread.Sleep(300);continue;}nextConnect=DateTime.UtcNow.AddSeconds(4);Connect();}
    HandleCommand();var now=DateTime.UtcNow;
    if(now>=nextState){RefreshCall();nextState=now.AddSeconds(2);WriteVoice();}
    if(now>=nextGuilds){RefreshGuilds();nextGuilds=now.AddSeconds(60);WriteVoice();}
    string watched;DateTime until;lock(voiceLock){watched=watchGuild;until=watchUntil;}
    if(watched!=""&&now<until&&now>=nextMembers){RefreshMembers(watched);nextMembers=now.AddSeconds(5);WriteVoice();}
   }catch(Exception e){SetVoiceError(e.Message);try{if(rpc!=null)rpc.Dispose();}catch{}rpc=null;WriteVoice();}
   Thread.Sleep(120);
  }
 }
}
