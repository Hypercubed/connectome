# connectome

Web tool for exploring cell-cell ligand-receptor mediated communication networks

## Introduction

In Ramilowski et al. ‘A draft network of ligand-receptor mediated multicellular signaling in human’ 2015 [doi:10.1038/ncomms8866](dx.doi.org/10.1038/ncomms8866) we present the first large-scale map of cell-to-cell communication between 144 human primary cell types using 2,422 putative and literature supported ligand-receptor pairs. With up to hundreds of potential interactions between any two of these 144 primary cell types, there are millions of possible cell-cell communication paths across the entire network. Static visualization of such complex networks not only can be obscure and impractical but also difficult. With that, and to benefit the research community, we provide an online resource that visualizes, on demand, our cell-cell communication network for any given subset of the ligand-receptor pairs and profiled primary cells. An online version of the resource is located at: [Ramilowski_et_al_2015](http://fantom.gsc.riken.jp/5/suppl/Ramilowski_et_al_2015/vis/) and mirrored at [forrest-lab.github.io/connectome](http://forrest-lab.github.io/connectome).

We developed the online connectome visualization application using various open source and custom tools.  The vector graphic visualization is generated using the [D3.js visualization library][d3].  The application interface was developed using the [AngularJS web application framework][angular] and the [twitter bootstrap front-end framework][twbs].

The visualization interface takes the the expression files generated in this study along with other metadata in tabular format [Ramilowski_et_al_2015](http://fantom.gsc.riken.jp/5/suppl/Ramilowski_et_al_2015/) to generate the network/hive visualization as shown in figure 5 in the paper.

# For Developers

## Background

To install a copy of this application you will need [node and npm](http://nodejs.org/), Grunt, and Bower. If you are not familiar it would be worthwhile to read up on [node and npm](http://www.joyent.com/blog/installing-node-and-npm/), [Grunt](https://github.com/gruntjs/grunt/wiki/Getting-started) and [bower](http://bower.io/).

## Download and Install

```
git clone https://github.com/Hypercubed/connectome.git
cd connectome
npm install
bower install
```

## Summary of Directory Layout

    app/                --> all of the files to be used in development
      bower_components/    --> AngularJS and 3rd party JavaScript libraries installed using bower
      components/          --> Application components
      data/                --> data files
    test/               --> test source files and libraries
    package.json        --> npm's config file
    bower.json          --> bower's config file
    Gruntfile.js        --> Grunt config file
    README.md           --> This file

## Adding data

This git repository include the data files that acompany the above referenced paper. You add your own into the app/data/ folder. All data files should be Tab-Seperated-Value (TSV) files.

## Grunt

Grunt is a JavaScript based task runner.  In this project Grunt is used for many tasks including testing, minification, and even deployment.  If you are not familiar with Grunt please read the [Getting started guide](https://github.com/gruntjs/grunt/wiki/Getting-started).

Summary of Grunt tasks:

             clean  Clean files and folders.
              test  Run all tests
             build  Prepare project for deployment.
             serve  Run a test server
             deploy Build and deploy to github

## Running the app during development

Running `grunt serve` will run a test server on the local host and open your default web browser to http://localhost:9000/.

# Contact

For more information please contact J. Harshbarger

## Acknowledgments

This work was supported by a research grant from the Japanese Ministry of Education, Culture, Sports, Science and Technology (MEXT) to the RIKEN Center for Life Science Technologies.

## Reference

> **A draft network of ligand–receptor-mediated multicellular signalling in human**

> Jordan A. Ramilowski,	Tatyana Goldberg,	Jayson Harshbarger,	Edda Kloppman,	Marina Lizio,	Venkata P. Satagopam,	Masayoshi Itoh,	Hideya Kawaji,	Piero Carninci,	Burkhard Rost & Alistair R. R. Forrest

> Nature Communications 6, Article number: 7866 [doi:10.1038/ncomms8866](http://doi.org/10.1038/ncomms8866)

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

Copyright (c) 2015 RIKEN, Japan.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[d3]: http://d3js.org/ "Data-Driven Documents"
[angular]: http://angularjs.org/ "AngularJS Framework"
[twbs]: http://getbootstrap.com/2.3.2/ "Twitter bootstrap"
