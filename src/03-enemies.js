/* ================= enemies ================= */
let EN_MESH=null;const enemies=[];const E_SCALE=4.4;
function buildEnemyTemplate(gltf){let src=null;gltf.scene.traverse(o=>{if(o.isMesh&&!src)src=o});
  src.material.envMap=ENV;src.material.envMapIntensity=.4;EN_MESH=src}
function hitFlash(e){e.flash=1}
function knock(e,dir,speed,time){if(e.ms&&e.hp>1&&!(e.launched>0)){msArmor(e,dir);return}clearTele(e);if(e.isBoss){speed*=.55;time=2.8;e.rad=10.5;e.down=0;BOSS.tele=0;sfx("specBurst")}e.v.copy(dir).multiplyScalar(speed);e.launched=time;e.chain=0;e.spin.set((Math.random()-.5)*16,(Math.random()-.5)*16,(Math.random()-.5)*16)}
