/* ================= enemies ================= */
let EN_MESH=null;const enemies=[];const E_SCALE=4.4;
function buildEnemyTemplate(gltf){let src=null;gltf.scene.traverse(o=>{if(o.isMesh&&!src)src=o});
  src.material.envMap=ENV;src.material.envMapIntensity=.4;EN_MESH=src}
function hitFlash(e){e.flash=1}
var HIT_SRC=null; // "rifle" / "blade" while that weapon is resolving a hit (tutorial checks which weapon actually scored)
function knock(e,dir,speed,time){if(e&&!e.isRemote)e.hitBy=HIT_SRC||"other";if(e.isBoss&&!(e.down>0)){bossClang(e);return} /* armoured while active: hits bounce off instead of flinging it away */if(e.isBoss&&bossPhase2(e))return;if(e.arc)e.arc.mesh.visible=false;if(e.ms&&e.hp>1&&!(e.launched>0)){msArmor(e,dir);return}clearTele(e);if(e.isBoss){speed*=.55;time=2.8;e.rad=10.5;e.down=0;BOSS.tele=0;sfx("specBurst")}e.v.copy(dir).multiplyScalar(speed);e.launched=time;e.chain=0;e.spin.set((Math.random()-.5)*16,(Math.random()-.5)*16,(Math.random()-.5)*16)}
