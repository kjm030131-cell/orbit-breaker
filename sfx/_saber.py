# Beam saber set mixed from the user's ElevenLabs takes (beam_blade / sci_fi / plasma_cut zips).
# usage: python sfx/_saber.py <dir with the 9 wavs> <out dir>
import subprocess,sys,glob,os,numpy as np
S=sys.argv[1];O=sys.argv[2]
def src(tag):return glob.glob(f"{S}/**/{tag}_*.wav",recursive=True)[0]
def mix(out,layers,dur,bass=0,fout=.12,lufs=-14,lp=0):
    args=['ffmpeg','-v','error','-y'];fc=[]
    for i,(tag,st,en,dl,g,rate) in enumerate(layers):
        args+=['-i',src(tag)]
        fc.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=mono,atrim={st}:{en},asetpts=PTS-STARTPTS,afade=t=in:d=0.004,afade=t=out:st={max(0,(en-st)*.55):.3f}:d={(en-st)*.45:.3f},asetrate={int(44100*rate)},aresample=44100,volume={g},adelay={int(dl*1000)}[l{i}]")
    m=''.join(f'[l{i}]' for i in range(len(layers)))+f"amix=inputs={len(layers)}:normalize=0:duration=longest,atrim=0:{dur},afade=t=out:st={max(0,dur-fout):.3f}:d={fout:.3f}"
    if bass:m+=f",bass=g={bass}:f=110:w=0.7"
    if lp:m+=f",lowpass=f={lp}"
    m+=f",alimiter=limit=0.95:level=false,loudnorm=I={lufs}:TP=-1:LRA=11[o]";fc.append(m)
    r=subprocess.run(args+['-filter_complex',';'.join(fc),'-map','[o]','-ar','44100','-ac','1','-b:a','128k',f"{O}/{out}.mp3"],capture_output=True,text=True)
    print(out,"OK" if r.returncode==0 else r.stderr[:500])
L=lambda tag,st,en,dl=0,g=1,rate=1:(tag,st,en,dl,g,rate)
mix('slash', [L('Beam_blade_1',.05,.50,0,1,1.08),L('Sci_fi_blade_3',1.0,1.35,0,.35,1.1)],.46,bass=3)
mix('slash2',[L('Sci_fi_blade_1',.78,1.25,0,1,1.15),L('Beam_blade_1',.05,.32,0,.55,1.25)],.44,bass=2)
mix('slash3',[L('Sci_fi_blade_3',.78,1.55,0,1,.92),L('Beam_blade_1',.05,.62,0,.7,.85)],.75,bass=5,fout=.25)
mix('ignite',[L('Beam_blade_3',.06,1.3,0,1,1)],1.15,bass=2,fout=.4)
mix('clash', [L('Beam_blade_2',.06,.62,0,1,1),L('Plasma_cut_3',.25,.6,0,.5,1),L('Beam_blade_1',.05,.32,0,.6,.7)],.6,bass=4,fout=.2)
mix('sizzle',[L('Plasma_cut_1',.1,.42,0,1,1)],.3,fout=.18,lufs=-18)
# seamless loop for the idle hum texture: 5 s of plasma_cut_2, tail cross-faded into the head
raw=subprocess.run(['ffmpeg','-v','error','-i',src('Plasma_cut_2'),'-ac','1','-ar','44100','-f','f32le','-'],capture_output=True).stdout
x=np.frombuffer(raw,np.float32)[44100:6*44100].copy();xf=int(.4*44100);w=np.linspace(0,1,xf)
y=x[:-xf].copy();y[:xf]=y[:xf]*w+x[-xf:]*(1-w);y/=np.abs(y).max()+1e-9;y*=.7
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar','44100','-ac','1','-i','-','-af','lowpass=f=2400,highpass=f=120,volume=16dB,alimiter=limit=0.9','-b:a','96k',f"{O}/humtex.mp3"],input=y.astype(np.float32).tobytes());print('humtex OK')
