using LiteDB;
using System.Text.Json;
var root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Playnite", "library");
var dir = args.Length > 0 ? args[0] : Path.Combine(Path.GetTempPath(), "nova-export");
Directory.CreateDirectory(dir);
var all = new Dictionary<string,object>();
foreach (var name in new[]{"games","sources","platforms","genres"}) {
  var src=Path.Combine(root,name+".db"); if(!File.Exists(src))continue;
  var snapshot=Path.Combine(dir,name+".db");
  using(var input=new FileStream(src,System.IO.FileMode.Open,FileAccess.Read,FileShare.ReadWrite))using(var output=File.Create(snapshot))input.CopyTo(output);
  using var db=new LiteDatabase("Filename="+snapshot+";ReadOnly=true");
  var collections=db.GetCollectionNames().ToArray();
  var docs=collections.SelectMany(c=>db.GetCollection(c).FindAll()).Select(d=>ConvertValue(d)).ToArray();
  all[name]=docs;
}
Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(all));
static object ConvertValue(BsonValue v){
 if(v.IsNull)return null;
 if(v.IsDocument)return v.AsDocument.ToDictionary(k=>k.Key,k=>ConvertValue(k.Value));
 if(v.IsArray)return v.AsArray.Select(ConvertValue).ToArray();
 if(v.IsGuid)return v.AsGuid.ToString();
 if(v.IsDateTime)return v.AsDateTime.ToUniversalTime().ToString("O");
 if(v.IsBinary)return Convert.ToBase64String(v.AsBinary);
 return v.RawValue;
}
