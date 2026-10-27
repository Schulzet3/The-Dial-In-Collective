export const OWNER='a1111111-1111-4111-8111-111111111111';
export const TIME='2026-10-01T12:00:00Z';
export function rawFixture(){return {
 preferences:{owner_id:OWNER,theme:'light',tasting_preferences:'clarity',active_setup_id:'setup',revision:1},
 setups:[{id:'setup',owner_id:OWNER,name:'Test Home',active_version_id:'version',revision:1,created_at:TIME}],
 versions:[{id:'version',owner_id:OWNER,setup_id:'setup',machine_model:'Test machine',grinder_model:'Test grinder',burr_set:'Test burrs',created_at:TIME}],
 setupPreferences:[{setup_id:'setup',setup_version_id:'version',calibration_id:'cal',default_basket_version_id:'basketv',track_temperature:false,track_slow_feed:false,multiple_baskets:false,slow_feed:false,temperature_unit:'F',revision:1}],
 calibrations:[{id:'cal',setup_id:'setup',grinder_model:'Test grinder',burr_set:'Test burrs',finest_setting:0,coarsest_setting:5,created_at:TIME}],
 baskets:[{id:'basket',setup_id:'setup',name:'18 g basket'}],basketVersions:[{id:'basketv',basket_id:'basket',setup_id:'setup',basket_dose_g:18,created_at:TIME}],
 library:[{id:'coffee',owner_id:OWNER,submission_id:'submission',created_at:TIME}],
 submissions:[{id:'submission',proposed_data:{name:'Test Coffee',roaster:'Fictional Roaster',roast_level:'Light',origin:'Test origin'},status:'pending'}],coffees:[],
 workspaces:[{owner_id:OWNER,setup_id:'setup',setup_version_id:'version',current_library_entry_id:null,revision:1}],
 workspaceCoffees:[{owner_id:OWNER,setup_id:'setup',setup_version_id:'version',library_entry_id:'coffee',selected_style:'Turbo',basket_version_id:'basketv',revision:1}],shots:[],notes:[],families:[],recipePreferences:[]
};}
export function rawShot(overrides={}){return {id:'shot',owner_id:OWNER,setup_id:'setup',setup_version_id:'version',library_entry_id:'coffee',basket_version_id:'basketv',calibration_id:'cal',style:'Turbo',pulled_at:TIME,dose_g:18,yield_g:50,time_s:22,grind_setting:0,temperature_c:null,feed_mode:'unknown',extraction:3,body:3,clarity:5,sweetness:5,astringency:1,is_dialed_in:true,revision:2,personal_family_id:'family',equipment_snapshot:{machine_model:'Test machine',grinder_model:'Test grinder',burr_set:'Test burrs',finest_setting:0,coarsest_setting:5,basket_dose_g:18},...overrides};}
