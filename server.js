/*

   pp a javascript preprocessor

Copyright (c) 2010 Mike Coolin

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

var fs = require('fs'),
    files = [],
    opts = require('tav').set({
    src: {
        note: 'Source file(s) e.g. --src=file1.js,file2.js'
    },
    dst: {
        note: 'Destination to write the file e.g. --dst=o.js'
    },
    def: {
        note: 'Defintion(s) to create e.g. --def=DEBUG,NODE,BROWSER',
        value: ''
    },
    debug : {
        note : 'Enable debugging',
        value : false
    }
}, "Usage: node pp.js with the following options");
    
doPreprocess(opts);    

function doPreprocess(opts){
    if(debug){
        console.log(opts);
    }
    var sa,
        writestream = fs.createWriteStream(opts.dst,
            { flags: 'w',
                encoding: 'utf8',
                mode: 0666
            }),
        debug = opts.debug,
        defines = [],
        pplines=[],
        comment = '// ',
        commentCode='',
        cnt;
        
    // handle defines
    sa=opts.def.split(',');
    for(cnt=0;cnt<sa.length;cnt++){
        defines.push(sa[cnt]);
        log('Passed in define '+sa[cnt]);
    }

    sa=opts.src.split(',');
    for(cnt=0;cnt<sa.length;cnt++){
        loadFileandAddLineObject(sa[cnt],pplines);
    }

    ifPass(pplines, defines);

    if(debug){
       dumpLineObjarr(pplines);
    }

    for(cnt=0;cnt<pplines.length;cnt++){
        if(pplines[cnt].addComment){
            commentCode=comment;        
        } else {
            commentCode='';
        }
        writestream.write(commentCode + pplines[cnt].text + '\n', 'utf8');
    }    
        
    writestream.end('');       
}

function parseIf(str){
    return  trim(str.replace(/^\s*\/\/@if\b/,''));    
}

function parseInclude(str){
    return  trim(str.replace(/^\s*\/\/@include\b/,''));    
}

function parseDefine(str){
    return  trim(str.replace(/^\s*\/\/@define\b/,''));
}

function trim(str){
    return str.replace(/^\s\s*/, '')
            .replace(/\s\s*$/, '');
}

function include(arr,obj) {
    return (arr.indexOf(obj) != -1);
}

// Add file to process
// write a header and footer line of file that is being processed
// append file to file list
function addFile(fileName) {
    // add logic to detect infinite loops
    if(include(files,fileName)){
        throw new Error('file '+fileName+' has already been included');   
    }
    files.push(fileName);
}

// produce a string of x characters
function repeat(str, num) {
    var cnt, rv='';

    for (cnt = 0; cnt < num; cnt++) {
        rv += str;
    }
    return rv;
}

// loadFileandAddLineObject
function loadFileandAddLineObject(fileName,arr){
    var cnt, temparr=[],
        textheader, textfooter,
        headerlen = Math.round((80 - (fileName.length + 5)) / 2),
        footerlen = Math.round((80 - (fileName.length + 9)) / 2);
    
    temparr = fs.readFileSync(fileName, 'utf8').split('\n');
    
    // add a header and footer to the array for the file
    textheader = '// ' + repeat("-", headerlen) + ' ' + fileName + ' ' + repeat("-", headerlen);
    // log(textheader);
    textfooter = '// ' + repeat("-", footerlen) + ' end ' + fileName + ' ' + repeat("-", footerlen);
    // log(textfooter)
    temparr.unshift(textheader);
    temparr.push(textfooter);
    
    for(cnt=0;cnt<temparr.length;cnt++){
        arr.push(new lineObj(temparr[cnt]));
    }   
}

// dumplineObj
function dumpLineObjarr(arr){
    var cnt;
    
    for(cnt=0;cnt<arr.length;cnt++){
       log(cnt+' ac('+arr[cnt].addComment+') vl('+arr[cnt].ifval+')\t'+arr[cnt].text)
    }
}

// loop through lines and locate the if/endif blocks
function ifPass(arr,defines){
    var startEndStack = [],
        iv=false,
        dopop=false,
        pv, pa, pc,
        ifpattern=/^\s*\/\/@if\b/g,
        includepattern=/^\s*\/\/@include\b/g,
        elsepattern=/^\s*\/\/@else/g,
        definepattern = /^\s*\/\/@define\b/g,
        endifpattern = /^\s*\/\/@endif/g;
    
    for(cnt=0;cnt<arr.length;cnt++){
        if(!arr[cnt].addcomment){
            //define processing
            if (definepattern.test(arr[cnt].text)) {
                // get the parameter(s) and add then to the defines list
                //(assuming a csv list)
                pv = parseDefine(arr[cnt].text);
                log('parsedefine returned (' + pv + ')');
    
                pa = pv.split(',');
                for (pc = 0; pc < pa.length; pc++) {
                    log('adding ' + pa[pc] + ' to defines');
                    defines.push(pa[pc]);
                }
                arr[cnt].addComment=true;
            }
            
            // include processing
            if (includepattern.test(arr[cnt].text)) {
                pv = parseInclude(arr[cnt].text);
                arr[cnt].addComment=true;
              
                addFile(pv);
                if(arr[cnt].ifval!==false){
                    if(startEndStack.length>0 ){
                        if(startEndStack[(startEndStack.length-1)].iv){
                            loadFileandPrepend(pv, arr, cnt+1);
                        }
                    }
                }
            }           
            
            //if else endif
            if(ifpattern.test(arr[cnt].text)){
                pv = parseIf(arr[cnt].text);
                pa = pv.split(',');
                iv=false;
                for (pc = 0; pc < pa.length; pc++) {
                    if (include(defines, pa[pc])) {
                        iv = true;
                    }            
                }
                arr[cnt].addComment=true;
                arr[cnt].ifval=iv;
                if(startEndStack.length==1){
                    //arr[cnt].ifval=iv;
                } else {
                    if(startEndStack.length>0){
                     iv=arr[cnt].addComment=startEndStack[0].iv;
                    }
                }
                startEndStack.push(new ifobj(iv));
            } else {
                if(endifpattern.test(arr[cnt].text)){
                    arr[cnt].addComment=true;
                    if(startEndStack.length>0){
                        dopop=true;
                    }
                } else {
                    if(elsepattern.test(arr[cnt].text)){
                        if(startEndStack.length>0 ){
                            log('cnt='+cnt+' elselength='+startEndStack.length);
                            if(startEndStack[0].iv){
                                startEndStack[(startEndStack.length-1)].iv= (!startEndStack[(startEndStack.length-1)].iv);
                                arr[cnt].addcomment=startEndStack[0].iv;
                            }    
                        }
                        arr[cnt].addComment=true;
                    }
                }
            }
            
            if(!arr[cnt].addComment){
                // log(cnt);
                if(startEndStack.length>0){
                    arr[cnt].ifval=startEndStack[(startEndStack.length-1)].iv;
                    if(arr[cnt].ifval==false){
                        arr[cnt].addComment=true;
                    }
                }
            }
            
            // do line settings
            if(startEndStack>0){
                // arr[cnt].addComment=startEndStack[startEndStack.length-1].iv;
            }
            // log('cnt='+cnt+' '+startEndStack.length)
            if(dopop){
                startEndStack.pop();
                dopop=false;
            }
        }
    }
}

// load a file and prepend it to an array
function loadFileandPrepend(fileName, arr, at) {
    var cnt,
        textheader, textfooter,
        headerlen = Math.round((80 - (fileName.length + 5)) / 2),
        footerlen = Math.round((80 - (fileName.length + 9)) / 2), 
        temparr = [];
        
        temparr = fs.readFileSync(fileName, 'utf8').split('\n');

    // add a header and footer to the array for the file
    textheader = '// ' + repeat("-", headerlen) + ' ' + fileName + ' ' + repeat("-", headerlen);
    // log(textheader);
    textfooter = '// ' + repeat("-", footerlen) + ' end ' + fileName + ' ' + repeat("-", footerlen);
    // log(textfooter)
    temparr.unshift(textheader);
    temparr.push(textfooter);

    // loop through the array and insert the items to arr
    for (cnt=0; cnt<temparr.length; cnt++) {
        log('adding '+temparr[cnt]+' from '+fileName)
        arr.splice(at+cnt,0, new lineObj(temparr[cnt]));
    }
}

function log(str) {
    if (!opts.debug) {
        return;
    }
    console.log(str);
}

function lineObj(line){
    this.addComment=false;
    this.ifvars='';
    this.ifval=null;
    this.text=line;
} 

function dumpobj(obj){
    var n;
    for(n in obj){
        log(n+'='+obj[n]);
    }
}

function  ifobj(iv){
    this.iv=iv;
}

    

