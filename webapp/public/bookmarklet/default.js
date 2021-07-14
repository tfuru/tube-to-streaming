// ==ClosureCompiler==
// @output_file_name default.js
// @compilation_level SIMPLE_OPTIMIZATIONS
// @language_out ECMASCRIPT_2017
// ==/ClosureCompiler==

// クロージャーコンパイラ
// https://closure-compiler.appspot.com/home

javascript:(function(uid, url){
    s=document.createElement('script');
    s.src=url;
    document.body.appendChild(s);
    convert(uid);
})('dummy', 'https://tube-to-streaming.an.r.appspot.com/bookmarklet/tube-to-streaming.js')