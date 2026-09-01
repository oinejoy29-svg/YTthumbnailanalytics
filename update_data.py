import os, json, re, requests
from datetime import datetime, timedelta, timezone

API_KEY=os.environ["YOUTUBE_API_KEY"]
CHANNEL_ID=os.environ.get("YOUTUBE_CHANNEL_ID","UCiLmCoftZHWXSFuQlnEJSsQ")
DATA_FILE="data.json"
JST=timezone(timedelta(hours=9))
MEMBERS=["逢田珠里依","天野香乃愛","市原愛弓","江角怜音","大信田美月","大西葵","小澤愛実","髙橋舞","藤沢莉子","村山結香","山田杏佳","山野愛月"]

def api(url,params):
    p={**params,"key":API_KEY}
    r=requests.get(url,params=p,timeout=30); r.raise_for_status(); return r.json()

def iso_duration_seconds(s):
    m=re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?",s or "")
    if not m:return 0
    h,mi,se=[int(x or 0) for x in m.groups()]
    return h*3600+mi*60+se

def pretty_duration(sec):
    sec=int(sec); h=sec//3600; m=(sec%3600)//60; s=sec%60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"

def get_channel():
    d=api("https://www.googleapis.com/youtube/v3/channels",{"part":"statistics,snippet","id":CHANNEL_ID})
    return d["items"][0]

def get_all_videos():
    items=[]; token=None
    while True:
        p={"part":"id","channelId":CHANNEL_ID,"maxResults":50,"order":"date"}
        if token:p["pageToken"]=token
        d=api("https://www.googleapis.com/youtube/v3/search",p)
        items += [x["id"]["videoId"] for x in d.get("items",[]) if x["id"].get("kind")=="youtube#video"]
        token=d.get("nextPageToken")
        if not token:break
    out=[]
    for i in range(0,len(items),50):
        d=api("https://www.googleapis.com/youtube/v3/videos",{"part":"snippet,contentDetails,statistics","id":",".join(items[i:i+50])})
        for x in d.get("items",[]):
            sn=x["snippet"]; sec=iso_duration_seconds(x["contentDetails"]["duration"])
            out.append({
                "id":x["id"],"title":sn.get("title",""),"date":sn["publishedAt"][:10],
                "thumbnail":sn["thumbnails"].get("high",sn["thumbnails"].get("default",{})).get("url",""),
                "duration":pretty_duration(sec),"durationSeconds":sec,
                "viewCount":int(x["statistics"].get("viewCount",0)),
                "tags":[m for m in MEMBERS if m in sn.get("title","")]
            })
    return sorted(out,key=lambda x:x["date"])

def main():
    now=datetime.now(JST)
    with open(DATA_FILE,"r",encoding="utf-8") as f:data=json.load(f)
    channel=get_channel()
    current=int(channel["statistics"].get("subscriberCount",0))
    videos=get_all_videos()
    # At every scheduled run, record the completed previous JST calendar day.
    target=(now.date()-timedelta(days=1)).isoformat()
    existing={x["date"]:x for x in data.get("subscribers",[])}
    existing[target]={"date":target,"count":current}
    data["subscribers"]=sorted(existing.values(),key=lambda x:x["date"])
    data["currentSubscriberCount"]=current
    data["videos"]=videos
    data["updatedAt"]=now.isoformat()
    with open(DATA_FILE,"w",encoding="utf-8") as f:json.dump(data,f,ensure_ascii=False,indent=2)
    print(f"updated {now.isoformat()} / subscribers={current} / videos={len(videos)} / recorded={target}")

if __name__=="__main__":main()
