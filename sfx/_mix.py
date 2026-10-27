import subprocess,sys,os
A=sys.argv[1]+'/all/';O=sys.argv[1]+'/out/'
def f(n):
    for e in ('.ogg','.wav'):
        if os.path.exists(A+n+e):return A+n+e
    raise SystemExit('missing '+n)
# layer: (name, delay_s, gain, rate, trim_s or None, fadeout_s or None)
def mix(out,layers,dur,bass=0,fin=0.003,fout=0.08,treble=0,peak=-1.0):
    args=['ffmpeg','-v','error','-y'];fc=[]
    for i,(n,dl,g,rate,trim,fo) in enumerate(layers):
        args+=['-i',f(n)]
        ch=f"[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,asetrate={int(44100*rate)},aresample=44100"
        if trim:ch+=f",atrim=0:{trim}"
        if fo and trim:ch+=f",afade=t=out:st={max(0,trim-fo)}:d={fo}"
        ch+=f",volume={g},adelay={int(dl*1000)}[l{i}]";fc.append(ch)
    m=''.join(f'[l{i}]' for i in range(len(layers)))+f"amix=inputs={len(layers)}:normalize=0:duration=longest"
    m+=f",atrim=0:{dur},afade=t=in:d={fin},afade=t=out:st={max(0,dur-fout)}:d={fout}"
    if bass:m+=f",bass=g={bass}:f=90:w=0.7"
    if treble:m+=f",treble=g={treble}:f=5000"
    m+=f",alimiter=limit=0.95:level=false,loudnorm=I=-14:TP={peak}:LRA=11[o]";fc.append(m)
    args+=['-filter_complex',';'.join(fc),'-map','[o]','-ar','44100','-ac','1','-b:a','112k',O+out+'.mp3']
    r=subprocess.run(args,capture_output=True,text=True)
    print(out,'OK' if r.returncode==0 else r.stderr[-400:])
L=lambda n,dl=0,g=1,r=1,t=None,fo=None:(n,dl,g,r,t,fo)
mix('shot',[L('laser_large_002',0,1,.82),L('impact_metal_heavy_001',0,.9,.6),L('low_frequency_explosion_000',0,.8,1.3,.4,.3)],.75,bass=7,treble=2)
mix('hit',[L('impact_metal_medium_001',0,1,1.05),L('force_field_001',0,.45,1.4,.3,.2),L('explosion_crunch_000',0,.35,1.5,.25,.2)],.45,bass=3)
mix('ignite',[L('force_field_002',0,1,.75),L('engine_circular_001',0,.35,1.6,.7,.4)],.9,bass=2)
mix('heavy',[L('impact_punch_heavy_001',0,1,.85),L('explosion_crunch_002',0,.75,.8),L('impact_metal_heavy_002',0,.8,.55)],.9,bass=6)
mix('boom',[L('explosion_crunch_000',0,1,.9),L('low_frequency_explosion_000',0,.7,1.1,.8,.5)],1.2,bass=5)
mix('destroyed',[L('low_frequency_explosion_001',0,1,1),L('explosion_crunch_001',0,1,.8),L('explosion_crunch_003',.25,.7,.75),L('explosion_crunch_004',.6,.55,.7)],2.6,bass=6,fout=.8)
mix('chain',[L('explosion_crunch_000',0,1,1),L('explosion_crunch_002',.12,.85,1.1),L('explosion_crunch_004',.24,.75,1.2)],1.1,bass=4)
mix('efire',[L('laser_small_002',0,1,.85),L('laser_retro_001',0,.3,.7)],.45,bass=2)
mix('block',[L('impact_bell_heavy_000',0,.8,1.4,.6,.4),L('force_field_003',0,.6,1.3,.4,.3)],.6)
mix('dash',[L('thruster_fire_000',0,1,1.1,.85,.5),L('low_frequency_explosion_000',0,.4,1.6,.35,.3)],.85,fin=.02,bass=4)
mix('dodge',[L('thruster_fire_002',0,1,1.35,.5,.35)],.5,fin=.01,bass=2)
mix('hurt',[L('impact_plate_heavy_000',0,1,.8),L('impact_metal_heavy_003',0,.9,.6),L('error_004',.05,.5,1)],.8,bass=5)
mix('specBurst',[L('force_field_004',0,.8,.6),L('low_frequency_explosion_001',.15,1,1),L('explosion_crunch_003',.15,.8,.7)],2.2,bass=6,fout=.6)
mix('cataCharge',[L('engine_circular_000',0,1,.9,2.4,.3),L('force_field_000',1.4,.5,.7)],2.4,fin=1.4,bass=3)
mix('cataLaunch',[L('impact_metal_heavy_000',0,1,.45),L('low_frequency_explosion_000',0,1,1),L('space_engine_large_000',0,.8,1.2,1.8,1.0)],1.9,bass=6,fout=.6)
mix('lock',[L('select_001',0,1,1)],.35)
mix('uiok',[L('confirmation_001',0,1,1)],.5)
mix('ui',[L('click_002',0,1,1)],.2)
mix('uiback',[L('back_002',0,1,1)],.35)
mix('deny',[L('error_006',0,1,1)],.5)
mix('pickup',[L('confirmation_003',0,1,1)],.6)
mix('specReady',[L('maximize_006',0,1,1),L('force_field_000',0,.3,1.6,.5,.3)],.8)
mix('radio',[L('glitch_002',0,.6,1),L('click_001',0,.8,.8)],.35)
mix('doors',[L('door_open_001',0,1,.8)],1.2,bass=3)
