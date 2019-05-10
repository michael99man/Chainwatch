<h2 style="font-weight: bold" class="p-0 m-1">What is Chainwatch?</h2>
<p class="m-1 pb-2">Chainwatch is real-time blockchain network monitoring utility. Through chain reorganization detection and network statistics analysis, Chainwatch analyzes blockchain networks for attempted 51% attacks. Check out the Chainwatch Dashboard (source code <a href="https://github.com/michael99man/Chainwatch-Dashboard">here</a>) at <a href="http://chainwatch.info">http://chainwatch.info</a></p>

<h2 style="font-weight: bold" class="p-0 m-1">Detection Strategies:</h2>
<ol>
<li><span style="font-weight: bold">Detecting chain reorganization events:</span> Chainwatch maintains a sliding window to detect when forks are merged.</li>
<li><span style="font-weight: bold">Analyzing network statistics:</span> Chainwatch collects high-resolution data on network statistics (i.e. hashrate, blocktime, difficulty). </li>
<li><span style="font-weight: bold">Tracking miner hashrate share:</span> Chainwatch tracks the estimated hashrate of each miner over time, flagging miners that gain a majority hashrate.</li>
</ol>

<h2 style="font-weight: bold" class="p-0 m-1">Implementation Diagram</h2>
<p align="center">
<img src="http://chainwatch.info/resources/Chainwatch.png" width='60%' align='center'></img>
</p>

<h2 style="font-weight: bold" class="p-0 m-1">Princeton Independent Work Poster</h2>

<img src="http://chainwatch.info/resources/Poster.png"></img>


