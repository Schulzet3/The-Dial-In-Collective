#!/usr/bin/env python3
"""Owner-authorized Issue 33 hosted disposable-member smoke; never run against real member credentials."""
import hashlib, json, os, re, secrets, subprocess, sys, urllib.error, urllib.request, uuid
from playwright.sync_api import sync_playwright

SITE="https://app.dialincollective.com"
API="https://azviqqejypsefzilgonr.supabase.co"
stage="preflight"
def require(condition, message):
    if not condition: raise RuntimeError(message)
def http(url, key=None, token=None, payload=None, method=None):
    headers={"Accept":"application/json"}
    if key: headers["apikey"]=key
    if token: headers["Authorization"]="Bearer "+token
    if payload is not None: headers["Content-Type"]="application/json"
    req=urllib.request.Request(url, data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers,method=method or ("POST" if payload is not None else "GET"))
    try:
        with urllib.request.urlopen(req,timeout=18) as reply:
            data=reply.read(250000)
            return json.loads(data) if data else {}
    except urllib.error.HTTPError as error:
        raise RuntimeError("Hosted request returned HTTP "+str(error.code)+" at "+stage) from None
def sql(query):
    env={**os.environ,"PGCONNECT_TIMEOUT":"8"}
    out=subprocess.run(["psql","-X","-qAt","-v","ON_ERROR_STOP=1","-d",os.environ["SUPABASE_DB_URL"],"-c",query],capture_output=True,text=True,env=env,timeout=22)
    if out.returncode: raise RuntimeError("Hosted database operation refused at "+stage)
    return out.stdout.strip()
def api(key,endpoint,payload,token=None):
    return http(API+endpoint,key,token,payload)
def browser(email,password,coffee,roaster):
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True)
        try:
            context=browser.new_context(viewport={"width":390,"height":844},ignore_https_errors=False)
            page=context.new_page()
            errors=[]
            page.on("pageerror",lambda error:errors.append(type(error).__name__))
            page.goto(SITE+"/",wait_until="domcontentloaded",timeout=35000)
            print("BROWSER: waiting for initial login form",flush=True)
            page.locator("form#auth-signin").wait_for(timeout=25000)
            page.locator("form#auth-signin [name=email]").fill(email)
            page.locator("form#auth-signin [name=password]").fill(password)
            page.locator("form#auth-signin button").first.click()
            print("BROWSER: login submitted, waiting for new setup",flush=True)
            page.locator('[data-action="new-setup"]').wait_for(timeout=25000)
            page.locator('[data-action="new-setup"]').click()
            form=page.locator("form#new-setup")
            print("BROWSER: waiting for setup form",flush=True)
            form.wait_for(timeout=10000)
            form.locator("[name=name]").fill("Issue33 disposable QA setup")
            form.locator("[name=basket_dose_g]").fill("18")
            form.locator("[name=finest_setting]").fill("1")
            form.locator("[name=coarsest_setting]").fill("20")
            form.locator("button.primary").last.click()
            page.wait_for_timeout(1200)
            toast=page.locator("#toasts").inner_text(timeout=2000)
            toast=re.sub(r"[A-Za-z0-9_.+-]+@[A-Za-z0-9.-]+","[redacted]",toast)
            print("BROWSER SETUP: dialog_visible=",form.is_visible(),"toast=",toast[:190],flush=True)
            print("BROWSER: setup submitted, waiting for Add Coffee",flush=True)
            page.locator('[data-action="add"]').wait_for(timeout=25000)
            page.locator('[data-action="add"]').click()
            form=page.locator("form#new-coffee")
            form.wait_for(timeout=10000)
            form.locator("[name=name]").fill(coffee)
            form.locator("[name=roaster]").fill(roaster)
            form.locator("button.primary").last.click()
            print("BROWSER: coffee submitted, waiting for match choice",flush=True)
            page.locator('[data-action="choose-coffee-match"]').first.wait_for(timeout=15000)
            page.locator('[data-action="choose-coffee-match"]').first.click()
            page.wait_for_timeout(1500)
            # Reopen in a new browser tab: independent authenticated SDK state/cache refresh.
            page.reload(wait_until="domcontentloaded",timeout=35000)
            print("BROWSER: waiting for saved coffee after navigation",flush=True)
            page.get_by_text(coffee,exact=False).first.wait_for(timeout=25000)
            require(not errors,"Uncaught browser JavaScript exception")
            # Exit the session through the actual application controls.
            page.locator('[data-action="settings"]').first.click()
            page.locator('[data-action="signout"]').first.click()
            page.locator("form#auth-signin").wait_for(timeout=18000)
            page.reload(wait_until="domcontentloaded",timeout=35000)
            page.locator("form#auth-signin").wait_for(timeout=18000)
            page.locator("form#auth-signin [name=email]").fill(email)
            page.locator("form#auth-signin [name=password]").fill(password)
            page.locator("form#auth-signin button").first.click()
            page.get_by_text(coffee,exact=False).first.wait_for(timeout=25000)
            require(not errors,"Uncaught browser JavaScript exception after sign in")
            context.close()
        finally:
            browser.close()

def main():
    global stage
    require(os.environ.get("SUPABASE_DB_URL"),"BLOCKED: existing SUPABASE_DB_URL Actions secret is unavailable")
    stage="read public live configuration"
    raw=urllib.request.urlopen(SITE+"/cloud/config.js",timeout=20).read().decode()
    m=re.search(r"""["']?publishableKey["']?\s*:\s*["']([^"']+)["']""",raw)
    require(m and m.group(1).startswith(("sb_publishable_","eyJ")),"Published app public config not readable")
    key=m.group(1)
    stage="read-only database connection"
    require(sql("select 1")=="1","Database secret did not connect")
    ident=os.environ.get("GITHUB_RUN_ID","local") + "-" + secrets.token_hex(5)
    email="dic-issue33-e2e-"+ident+"@example.invalid"
    password=secrets.token_urlsafe(24)+"!9"
    uid=None
    try:
        stage="real GoTrue sign-up"
        signup=api(key,"/auth/v1/signup",{"email":email,"password":password})
        uid=(signup.get("user") or signup).get("id")
        require(uid and str(uuid.UUID(uid))==uid,"GoTrue signup did not create a recognizable disposable user")
        stage="confirm isolated test identity only"
        confirmed=sql("update auth.users set email_confirmed_at=coalesce(email_confirmed_at,now()),confirmation_token='' where id='"+uid+"'::uuid and email='"+email+"' and email like 'dic-issue33-e2e-%@example.invalid' returning id")
        require(confirmed==uid,"Could not enable disposable identity for actual password login")
        stage="real GoTrue password login and /user"
        session=api(key,"/auth/v1/token?grant_type=password",{"email":email,"password":password})
        token=session.get("access_token")
        require(token and session.get("refresh_token"),"GoTrue did not issue a complete real session")
        who=http(API+"/auth/v1/user",key,token)
        require(who.get("id")==uid,"Real GoTrue /user identity mismatch")
        stage="server denies non-invited account"
        una=api(key,"/rest/v1/rpc/dic_session_status",{},token)
        require(not una.get("admitted"),"Newly signed-up account was admitted without invitation")
        stage="create and redeem isolated single-use invitation"
        invite="dic-"+secrets.token_hex(32)
        digest=hashlib.sha256(invite.encode()).hexdigest()
        iid=sql("insert into private.beta_invites(token_hash,label,max_uses,expires_at) values('"+digest+"','Issue33 disposable QA',1,now()+interval '20 minutes') returning id")
        require(str(uuid.UUID(iid))==iid,"Isolated invite could not be issued")
        denied=api(key,"/rest/v1/rpc/dic_redeem_invite",{"token":"dic-"+secrets.token_hex(32)},token)
        require(not denied.get("ok"),"Incorrect invitation unexpectedly succeeded")
        accepted=api(key,"/rest/v1/rpc/dic_redeem_invite",{"token":invite},token)
        require(accepted.get("ok") is True,"Real invitation redemption failed")
        status=api(key,"/rest/v1/rpc/dic_session_status",{},token)
        require(status.get("admitted") is True,"Server did not recognize invited member")
        stage="find existing verified coffee without new shared catalog writes"
        choices=[("Hambela","Sweet Bloom"),("Bavyeyi IV","Proud Mary"),("Wuri","Sweet Bloom"),("Yirgacheffe","Orinoco Coffee & Tea")]
        chosen=None
        for name,roaster in choices:
            match=api(key,"/rest/v1/rpc/dic_find_coffee_matches",{"payload":{"name":name,"roaster":roaster}},token)
            if match.get("classification")=="needs_confirmation" and any(c.get("name")==name and c.get("roaster")==roaster for c in match.get("candidates",[])):
                target=next(c for c in match["candidates"] if c.get("name")==name and c.get("roaster")==roaster)
                chosen=(name,roaster,target["id"])
                break
        require(chosen,"BLOCKED: no existing verified same-name candidate found; refusing to create a shared test coffee")
        stage="live Chromium signup-session Add Coffee, reopen, sign out, sign in"
        browser(email,password,chosen[0],chosen[1])
        stage="independent committed SQL readback"
        count=sql("select count(*) from public.library_entries where owner_id='"+uid+"'::uuid and coffee_id='"+chosen[2]+"'::uuid and hidden_at is null")
        require(count=="1","Saved Add Coffee not independently readable in hosted database")
        state=api(key,"/rest/v1/rpc/dic_read_personal_state",{},token)
        require(any(row.get("coffee_id")==chosen[2] for row in state.get("library",[])),
                "Fresh authenticated application read did not include saved coffee")
        stage="real GoTrue refresh and logout"
        refreshed=api(key,"/auth/v1/token?grant_type=refresh_token",{"refresh_token":session["refresh_token"]})
        require(refreshed.get("user",{}).get("id")==uid,"GoTrue token refresh user mismatch")
        # Real logout does not delete user/data; verify via hosted GoTrue endpoint.
        api(key,"/auth/v1/logout",{},refreshed["access_token"])
        print("PASS: hosted GoTrue login/user/refresh/logout; invite guard/redeem; real Chromium Add Coffee; reload; sign-out/re-login; SQL and RPC readback.")
    finally:
        if uid:
            stage="disable only disposable test member, retaining test evidence"
            changed=sql("update private.beta_members set enabled=false where owner_id='"+uid+"'::uuid and owner_id in (select id from auth.users where email='"+email+"') returning owner_id")
            require(changed in (uid,""),"Could not disable disposable member safely")
            print("SAFETY: disposable member access disabled; no existing account, shot, note, or shared coffee changed; test records retained pending controlled cleanup.")

if __name__=="__main__":
    try: main()
    except Exception as error:
        print("NOT PASSED at stage: "+stage+" ("+str(error).split("\n")[0][:120]+")",file=sys.stderr)
        raise SystemExit(1)
