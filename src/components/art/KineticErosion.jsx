import React, { useEffect, useRef } from 'react';
import p5 from 'p5';

const KineticErosion = ({
    intensity = 1.2,
    volume = 4000,
    seed = 12345,
    width = 400,
    height = 300
}) => {
    const renderRef = useRef();

    useEffect(() => {
        let myP5 = new p5((s) => {

            // Params
            let params = {
                seed: seed,
                intensity: intensity,
                volume: volume,
                erosion: 15,
                scale: 0.008,
                colorHigh: s.color('#d97757'),
                colorLow: s.color('#6a9bcc'),
                colorBg: s.color('#f5f3ee')
            };

            let particles = [];
            let flowField = [];
            let cols, rows;
            let scl = 20;

            s.setup = () => {
                s.createCanvas(width, height);
                s.pixelDensity(1);
                s.background(params.colorBg);

                s.randomSeed(params.seed);
                s.noiseSeed(params.seed);

                initializeSystem();
            };

            const initializeSystem = () => {
                cols = s.floor(width / scl);
                rows = s.floor(height / scl);
                flowField = new Array(cols * rows);

                let yoff = 0;
                for (let y = 0; y < rows; y++) {
                    let xoff = 0;
                    for (let x = 0; x < cols; x++) {
                        let index = x + y * cols;
                        let angle = s.noise(xoff, yoff) * s.TWO_PI * 4;
                        let v = p5.Vector.fromAngle(angle);
                        v.setMag(1);
                        flowField[index] = v;
                        xoff += params.scale * 20;
                    }
                    yoff += params.scale * 20;
                }

                particles = [];
                for (let i = 0; i < params.volume; i++) {
                    particles.push(new Particle(s));
                }
            };

            s.draw = () => {
                // Optimization: Stop after some frames? Or let it erode continuously?
                // Let's run it.
                for (let i = 0; i < particles.length; i++) {
                    particles[i].follow(flowField);
                    particles[i].update();
                    particles[i].show();
                }
            };

            class Particle {
                constructor(p) {
                    this.p = p;
                    this.pos = p.createVector(p.random(width), p.random(height));
                    this.vel = p.createVector(0, 0);
                    this.acc = p.createVector(0, 0);
                    this.maxSpeed = p.random(1, 2) * params.intensity;
                    this.prevPos = this.pos.copy();
                    this.life = 255;
                    this.finished = false;
                }

                follow(vectors) {
                    let x = s.floor(this.pos.x / scl);
                    let y = s.floor(this.pos.y / scl);
                    let index = x + y * cols;
                    if (index >= 0 && index < vectors.length) {
                        this.acc.add(vectors[index]);
                    }
                }

                update() {
                    if (this.finished) return;
                    this.vel.add(this.acc);
                    this.vel.limit(this.maxSpeed);
                    this.pos.add(this.vel);
                    this.acc.mult(0);
                    this.life -= 0.5;
                    if (this.life <= 0) this.finished = true;
                    this.edges();
                }

                show() {
                    if (this.finished) return;
                    let speedNorm = this.vel.mag() / (2 * params.intensity);
                    let c = s.lerpColor(params.colorLow, params.colorHigh, speedNorm);
                    c.setAlpha(s.map(this.life, 0, 255, 0, params.erosion * 5));

                    s.stroke(c);
                    s.strokeWeight(1.5 * (speedNorm + 0.5));
                    s.line(this.pos.x, this.pos.y, this.prevPos.x, this.prevPos.y);

                    this.prevPos.x = this.pos.x;
                    this.prevPos.y = this.pos.y;
                }

                edges() {
                    if (this.pos.x > width) { this.pos.x = 0; this.prevPos.x = 0; }
                    if (this.pos.x < 0) { this.pos.x = width; this.prevPos.x = width; }
                    if (this.pos.y > height) { this.pos.y = 0; this.prevPos.y = 0; }
                    if (this.pos.y < 0) { this.pos.y = height; this.prevPos.y = height; }
                }
            }

        }, renderRef.current);

        return () => {
            myP5.remove();
        };
    }, [intensity, volume, seed, width, height]);

    return (
        <div ref={renderRef} className="rounded-xl overflow-hidden shadow-inner border border-white/10" />
    );
};

export default KineticErosion;
